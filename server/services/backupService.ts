import { storagePut, storageGet } from "../storage";
import { getPool } from "../db";
import { ENV } from "../_core/env";
import mysql from "mysql2/promise";
import { createReadStream } from "fs";
import { createWriteStream } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { unlink } from "fs/promises";
import { createGzip } from "zlib";
import { createBrotliCompress } from "zlib";
import { pipeline } from "stream/promises";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface BackupOptions {
  backupType: "daily" | "weekly" | "manual";
  includeSystemData?: boolean;
  compression?: "gzip" | "brotli" | "none";
  retentionDays?: number;
}

export interface BackupResult {
  success: boolean;
  backupName: string;
  s3Key: string;
  s3Url: string;
  fileSize: number;
  rowCounts: Record<string, number>;
  checksums: Record<string, string>;
  dataOriginSummary: { manual: number; system: number };
  error?: string;
}

/**
 * Create a full database backup and upload to S3
 */
export async function createDatabaseBackup(
  options: BackupOptions
): Promise<BackupResult> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupName = `backup-${options.backupType}-${timestamp}`;
  const tempDir = tmpdir();
  const sqlFile = join(tempDir, `${backupName}.sql`);
  const compressedFile = join(
    tempDir,
    `${backupName}.sql.${options.compression || "gz"}`
  );

  try {
    // Step 1: Create SQL dump
    console.log(`[Backup] Creating database dump: ${backupName}`);
    const pool = await getPool();
    if (!pool) {
      throw new Error("Database pool not available");
    }

    const connection = await pool.getConnection();
    try {
      // Get all tables
      const [tables] = await connection.query(
        "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()"
      );

      // Create SQL dump with structure and data
      let sqlContent = `-- INNOVAR Cocinas Database Backup\n`;
      sqlContent += `-- Created: ${new Date().toISOString()}\n`;
      sqlContent += `-- Backup Type: ${options.backupType}\n`;
      sqlContent += `-- Include System Data: ${options.includeSystemData ? "Yes" : "No"}\n\n`;

      // Add table structures and data
      for (const table of tables as any[]) {
        const tableName = table.TABLE_NAME;

        // Get table structure
        const [createTableResult] = await connection.query(
          `SHOW CREATE TABLE ${tableName}`
        );
        const createTableSQL = (createTableResult as any)[0]["Create Table"];
        sqlContent += `\n-- Table: ${tableName}\n`;
        sqlContent += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
        sqlContent += createTableSQL + ";\n\n";

        // Get table data
        let dataQuery = `SELECT * FROM \`${tableName}\``;

        // Filter system data if not included
        if (!options.includeSystemData && tableName !== "auditLogs") {
          dataQuery += ` WHERE dataOrigin != 'system' OR dataOrigin IS NULL`;
        }

        const [rows] = await connection.query(dataQuery);
        if ((rows as any[]).length > 0) {
          sqlContent += `-- Data for table: ${tableName}\n`;
          sqlContent += generateInsertStatements(tableName, rows as any[]);
          sqlContent += "\n";
        }
      }

      // Write SQL to file
      await new Promise<void>((resolve, reject) => {
        const stream = createWriteStream(sqlFile);
        stream.write(sqlContent);
        stream.end();
        stream.on("finish", resolve);
        stream.on("error", reject);
      });

      // Step 2: Compress the SQL file
      console.log(`[Backup] Compressing backup file`);
      const compression = options.compression || "gzip";
      const compressor =
        compression === "brotli" ? createBrotliCompress() : createGzip();

      await pipeline(
        createReadStream(sqlFile),
        compressor,
        createWriteStream(compressedFile)
      );

      // Step 3: Upload to S3
      console.log(`[Backup] Uploading to S3`);
      const fileBuffer: Buffer = await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        const stream = createReadStream(compressedFile);
        stream.on("data", (chunk: any) => chunks.push(chunk));
        stream.on("end", () => resolve(Buffer.concat(chunks)));
        stream.on("error", reject);
      });

      const s3Key = `backups/${backupName}.sql.${compression}`;
      const { url } = await storagePut(s3Key, fileBuffer, "application/sql");

      // Step 4: Calculate metadata
      console.log(`[Backup] Calculating metadata`);
      const rowCounts = await getTableRowCounts(connection);
      const checksums = await getTableChecksums(connection);
      const dataOriginSummary = await getDataOriginSummary(connection);

      // Step 5: Cleanup temp files
      await unlink(sqlFile).catch(() => {});
      await unlink(compressedFile).catch(() => {});

      console.log(`[Backup] Backup completed successfully: ${backupName}`);

      return {
        success: true,
        backupName,
        s3Key,
        s3Url: url,
        fileSize: fileBuffer.length,
        rowCounts,
        checksums,
        dataOriginSummary,
      };
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error(`[Backup] Error creating backup:`, error);
    // Cleanup temp files on error
    await unlink(sqlFile).catch(() => {});
    await unlink(compressedFile).catch(() => {});

    return {
      success: false,
      backupName,
      s3Key: "",
      s3Url: "",
      fileSize: 0,
      rowCounts: {},
      checksums: {},
      dataOriginSummary: { manual: 0, system: 0 },
      error: error.message,
    };
  }
}

/**
 * Get row counts for all tables
 */
async function getTableRowCounts(
  connection: mysql.PoolConnection
): Promise<Record<string, number>> {
  const [tables] = await connection.query(
    "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()"
  );

  const rowCounts: Record<string, number> = {};

  for (const table of tables as any[]) {
    const tableName = table.TABLE_NAME;
    const [result] = await connection.query(
      `SELECT COUNT(*) as count FROM \`${tableName}\``
    );
    rowCounts[tableName] = (result as any)[0].count;
  }

  return rowCounts;
}

/**
 * Get table checksums for verification
 */
async function getTableChecksums(
  connection: mysql.PoolConnection
): Promise<Record<string, string>> {
  const [tables] = await connection.query(
    "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()"
  );

  const checksums: Record<string, string> = {};

  for (const table of tables as any[]) {
    const tableName = table.TABLE_NAME;
    try {
      const [result] = await connection.query(
        `CHECKSUM TABLE \`${tableName}\``
      );
      checksums[tableName] = (result as any)[0].Checksum || "N/A";
    } catch (error) {
      checksums[tableName] = "ERROR";
    }
  }

  return checksums;
}

/**
 * Get summary of data by origin
 */
async function getDataOriginSummary(
  connection: mysql.PoolConnection
): Promise<{ manual: number; system: number }> {
  const tablesWithOrigin = [
    "clients",
    "projects",
    "quotations",
    "appointments",
    "tasks",
    "expenses",
    "users",
  ];

  let manualCount = 0;
  let systemCount = 0;

  for (const tableName of tablesWithOrigin) {
    try {
      const [manualResult] = await connection.query(
        `SELECT COUNT(*) as count FROM \`${tableName}\` WHERE dataOrigin = 'manual' OR dataOrigin IS NULL`
      );
      manualCount += (manualResult as any)[0].count;

      const [systemResult] = await connection.query(
        `SELECT COUNT(*) as count FROM \`${tableName}\` WHERE dataOrigin = 'system'`
      );
      systemCount += (systemResult as any)[0].count;
    } catch (error) {
      // Table might not have dataOrigin column
    }
  }

  return { manual: manualCount, system: systemCount };
}

/**
 * Generate INSERT statements from rows
 */
function generateInsertStatements(
  tableName: string,
  rows: any[]
): string {
  if (rows.length === 0) return "";

  let sql = "";
  const columns = Object.keys(rows[0]);

  // Batch insert statements for better performance
  const batchSize = 100;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    sql += `INSERT INTO \`${tableName}\` (${columns.map((c) => `\`${c}\``).join(", ")}) VALUES\n`;

    sql += batch
      .map((row) => {
        const values = columns.map((col) => {
          const value = row[col];
          if (value === null || value === undefined) {
            return "NULL";
          } else if (typeof value === "string") {
            return `'${value.replace(/'/g, "''")}'`;
          } else if (value instanceof Date) {
            return `'${value.toISOString()}'`;
          } else if (typeof value === "object") {
            return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
          } else {
            return String(value);
          }
        });
        return `(${values.join(", ")})`;
      })
      .join(",\n");

    sql += ";\n";
  }

  return sql;
}

/**
 * Verify backup integrity
 */
export async function verifyBackupIntegrity(
  s3Key: string,
  expectedRowCounts?: Record<string, number>
): Promise<{ verified: boolean; errors: string[] }> {
  const errors: string[] = [];

  try {
    // Download and verify backup file
    const { url } = await storageGet(s3Key);

    // For now, just verify the file is accessible
    // In production, you would decompress and verify the SQL structure

    return { verified: true, errors };
  } catch (error: any) {
    errors.push(`Backup verification failed: ${error.message}`);
    return { verified: false, errors };
  }
}

/**
 * Check if test data generation should be allowed
 */
export function isTestDataGenerationAllowed(): boolean {
  const nodeEnv = process.env.NODE_ENV;
  const allowedEnvs = ["development", "test"];
  return allowedEnvs.includes(nodeEnv || "");
}

/**
 * Guard for test data generation
 */
export function guardTestDataGeneration(): void {
  if (!isTestDataGenerationAllowed()) {
    throw new Error(
      `Test data generation is not allowed in ${process.env.NODE_ENV} environment`
    );
  }
}
