import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  CheckCircle2, Clock, AlertCircle, Upload, FileText, Building2,
  ChevronRight, Download, Trash2, RefreshCw, CalendarCheck, Receipt,
} from "lucide-react";

const CURRENT_YEAR = new Date().getFullYear();

const OBL_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  seguridad_social: { label: "Seguridad Social", color: "text-blue-300",    bg: "bg-blue-500/15" },
  retencion:        { label: "Retención",         color: "text-yellow-300",  bg: "bg-yellow-500/15" },
  ica:              { label: "ICA",               color: "text-purple-300",  bg: "bg-purple-500/15" },
  iva:              { label: "IVA",               color: "text-teal-300",    bg: "bg-teal-500/15" },
};

const STATUS_CFG = {
  pendiente: { icon: Clock,          label: "Pendiente",  badge: "bg-red-500/15 text-red-300 border-red-500/30" },
  pagado:    { icon: CheckCircle2,   label: "Pagado",     badge: "bg-green-500/15 text-green-300 border-green-500/30" },
  declarado: { icon: CalendarCheck,  label: "Declarado",  badge: "bg-teal-500/15 text-teal-300 border-teal-500/30" },
};

const DOC_TYPES = [
  { value: "seguridad_social", label: "Seguridad Social" },
  { value: "retencion",        label: "Retención en la Fuente" },
  { value: "ica",              label: "ICA" },
  { value: "iva",              label: "IVA" },
  { value: "nomina",           label: "Nómina" },
  { value: "otro",             label: "Otro" },
];

const MONTHS = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
];

const PROJECT_STATUSES: Record<string, string> = {
  pendiente: "Pendiente",
  en_diseno: "En Diseño",
  en_produccion: "En Producción",
  instalacion: "Instalación",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

// ── Derrotero ────────────────────────────────────────────────────────────────
function Derrotero() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<any>(null);
  const [form, setForm] = useState({ status: "pagado", amount: "", notes: "" });

  const { data: derrotero = [], refetch, isLoading } = trpc.contador.getDerrotero.useQuery({ year });
  const markMut = trpc.contador.markObligation.useMutation({
    onSuccess: () => { toast.success("Obligación actualizada"); refetch(); setDialog(null); },
    onError: (e) => toast.error(e.message),
  });

  const grouped = derrotero.reduce((acc: Record<string, any[]>, item: any) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {});

  const pending = derrotero.filter((d: any) => d.status === "pendiente").length;
  const done    = derrotero.filter((d: any) => d.status !== "pendiente").length;

  function openMark(item: any) {
    setDialog(item);
    setForm({ status: item.status === "pendiente" ? "pagado" : item.status, amount: item.amount ?? "", notes: item.notes ?? "" });
  }

  function handleMark() {
    if (!dialog) return;
    const key = `${dialog.type}_${dialog.period}`;
    setMarkingId(key);
    markMut.mutate({
      type: dialog.type,
      year: dialog.year,
      period: dialog.period,
      status: form.status as any,
      amount: form.amount ? parseFloat(form.amount) : undefined,
      notes: form.notes || undefined,
    }, { onSettled: () => setMarkingId(null) });
  }

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-28 bg-white/[0.06] border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" onClick={() => refetch()} className="text-white/60 hover:text-white">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-3 text-sm">
          <span className="text-red-300 font-medium">{pending} pendientes</span>
          <span className="text-white/30">·</span>
          <span className="text-green-300 font-medium">{done} completadas</span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12 text-white/40">Cargando derrotero...</div>
      ) : (
        Object.entries(grouped).map(([type, items]: [string, any[]]) => {
          const meta = OBL_LABELS[type] ?? { label: type, color: "text-white", bg: "bg-white/10" };
          return (
            <Card key={type} className="bg-white/[0.03] border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>
                    {meta.label}
                  </span>
                  <span className="text-white/40 text-xs font-normal">
                    {items[0]?.periodType === "mensual" ? "Mensual"
                      : items[0]?.periodType === "bimestral" ? "Bimestral"
                      : "Cuatrimestral"}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {items.map((item: any) => {
                    const cfg = STATUS_CFG[item.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.pendiente;
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={`${item.type}_${item.period}`}
                        onClick={() => openMark(item)}
                        className="flex items-center justify-between px-3 py-2 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/20 transition-all text-left"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className={`h-4 w-4 flex-shrink-0 ${item.status === "pendiente" ? "text-red-400" : "text-green-400"}`} />
                          <span className="text-sm text-white/80 truncate">{item.periodLabel}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          {item.amount && (
                            <span className="text-xs text-white/40">
                              ${Number(item.amount).toLocaleString("es-CO")}
                            </span>
                          )}
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${cfg.badge}`}>
                            {cfg.label}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Dialog marcar obligación */}
      <Dialog open={!!dialog} onOpenChange={() => setDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialog ? `${OBL_LABELS[dialog.type]?.label} — ${dialog.periodLabel}` : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="mt-1 bg-white/[0.06] border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="pagado">Pagado</SelectItem>
                  <SelectItem value="declarado">Declarado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor pagado (opcional)</Label>
              <Input
                className="mt-1 bg-white/[0.06] border-white/10 text-white"
                placeholder="Ej: 450000"
                type="number"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div>
              <Label>Notas (opcional)</Label>
              <Textarea
                className="mt-1 bg-white/[0.06] border-white/10 text-white resize-none"
                rows={2}
                placeholder="Referencia de pago, observaciones..."
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(null)}>Cancelar</Button>
            <Button onClick={handleMark} disabled={markMut.isPending} className="bg-teal-600 hover:bg-teal-500">
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Documentos ───────────────────────────────────────────────────────────────
function Documentos() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [filterType, setFilterType] = useState("todos");
  const [uploadDialog, setUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    obligationType: "seguridad_social",
    year: CURRENT_YEAR,
    month: new Date().getMonth() + 1,
    description: "",
    file: null as File | null,
  });
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: docs = [], refetch, isLoading } = trpc.contador.listDocuments.useQuery({
    year,
    obligationType: filterType !== "todos" ? filterType : undefined,
  });

  const addMut = trpc.contador.addDocument.useMutation({
    onSuccess: () => {
      toast.success("Documento subido correctamente");
      setUploadDialog(false);
      setUploadForm(f => ({ ...f, file: null, description: "" }));
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const delMut = trpc.contador.deleteDocument.useMutation({
    onSuccess: () => { toast.success("Documento eliminado"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  async function handleUpload() {
    if (!uploadForm.file) return toast.error("Selecciona un archivo");
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = (e.target?.result as string) ?? "";
        addMut.mutate({
          obligationType: uploadForm.obligationType as any,
          year: uploadForm.year,
          month: uploadForm.month,
          fileName: uploadForm.file!.name,
          fileData: base64,
          description: uploadForm.description || undefined,
        });
        setUploading(false);
      };
      reader.onerror = () => { toast.error("Error leyendo archivo"); setUploading(false); };
      reader.readAsDataURL(uploadForm.file);
    } catch {
      setUploading(false);
      toast.error("Error subiendo documento");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-24 bg-white/[0.06] border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-44 bg-white/[0.06] border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los tipos</SelectItem>
              {DOC_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setUploadDialog(true)} className="bg-teal-600 hover:bg-teal-500 gap-2">
          <Upload className="h-4 w-4" />
          Subir documento
        </Button>
      </div>

      {isLoading ? (
        <div className="text-white/40 text-center py-10">Cargando documentos...</div>
      ) : docs.length === 0 ? (
        <div className="text-center py-16 text-white/30">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No hay documentos registrados para este período</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(docs as any[]).map((doc) => {
            const typeLabel = DOC_TYPES.find(t => t.value === doc.obligationType)?.label ?? doc.obligationType;
            const meta = OBL_LABELS[doc.obligationType] ?? { color: "text-white/60", bg: "bg-white/10" };
            return (
              <div key={doc.id} className="flex items-center gap-3 px-4 py-3 rounded-md bg-white/[0.04] border border-white/[0.06] hover:border-white/15 transition-all">
                <Receipt className="h-5 w-5 text-white/40 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-white/90 font-medium truncate">{doc.fileName}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${meta.bg} ${meta.color}`}>{typeLabel}</span>
                  </div>
                  <div className="text-xs text-white/40 mt-0.5">
                    {MONTHS[doc.month - 1]} {doc.year}
                    {doc.description ? ` · ${doc.description}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-white/50 hover:text-white">
                      <Download className="h-4 w-4" />
                    </Button>
                  </a>
                  <Button
                    variant="ghost" size="icon"
                    className="h-8 w-8 text-white/30 hover:text-red-400"
                    onClick={() => { if (confirm("¿Eliminar este documento?")) delMut.mutate({ id: doc.id }); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog subir */}
      <Dialog open={uploadDialog} onOpenChange={setUploadDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Subir comprobante / documento</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo de obligación</Label>
                <Select value={uploadForm.obligationType} onValueChange={v => setUploadForm(f => ({ ...f, obligationType: v }))}>
                  <SelectTrigger className="mt-1 bg-white/[0.06] border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Año</Label>
                <Select value={String(uploadForm.year)} onValueChange={v => setUploadForm(f => ({ ...f, year: Number(v) }))}>
                  <SelectTrigger className="mt-1 bg-white/[0.06] border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Mes</Label>
              <Select value={String(uploadForm.month)} onValueChange={v => setUploadForm(f => ({ ...f, month: Number(v) }))}>
                <SelectTrigger className="mt-1 bg-white/[0.06] border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descripción (opcional)</Label>
              <Input
                className="mt-1 bg-white/[0.06] border-white/10 text-white"
                placeholder="Ej: Planilla PILA julio 2026"
                value={uploadForm.description}
                onChange={e => setUploadForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div>
              <Label>Archivo PDF</Label>
              <div
                className="mt-1 border border-dashed border-white/20 rounded-md p-4 text-center cursor-pointer hover:border-teal-500/50 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                {uploadForm.file ? (
                  <p className="text-sm text-teal-300 truncate">{uploadForm.file.name}</p>
                ) : (
                  <div className="text-white/40 text-sm">
                    <Upload className="h-6 w-6 mx-auto mb-1 opacity-50" />
                    Clic para seleccionar PDF
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={e => setUploadForm(f => ({ ...f, file: e.target.files?.[0] ?? null }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setUploadDialog(false)}>Cancelar</Button>
            <Button
              onClick={handleUpload}
              disabled={uploading || addMut.isPending || !uploadForm.file}
              className="bg-teal-600 hover:bg-teal-500"
            >
              {uploading || addMut.isPending ? "Subiendo..." : "Subir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Proyectos DIAN ────────────────────────────────────────────────────────────
function ProyectosDIAN() {
  const [statusFilter, setStatusFilter] = useState("todos");
  const { data: rows = [], isLoading } = trpc.contador.getProjectsDIAN.useQuery({
    status: statusFilter !== "todos" ? statusFilter : undefined,
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 bg-white/[0.06] border-white/10 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            {Object.entries(PROJECT_STATUSES).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-white/40">{(rows as any[]).length} proyectos</span>
      </div>

      {isLoading ? (
        <div className="text-white/40 text-center py-10">Cargando proyectos...</div>
      ) : (rows as any[]).length === 0 ? (
        <div className="text-center py-16 text-white/30">
          <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No hay proyectos con ese filtro</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/[0.06] text-white/50 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Proyecto</th>
                <th className="px-4 py-3 text-left">Cliente / Razón social</th>
                <th className="px-4 py-3 text-left">Doc.</th>
                <th className="px-4 py-3 text-left">No. Documento</th>
                <th className="px-4 py-3 text-left">Correo</th>
                <th className="px-4 py-3 text-right">Valor (antes IVA)</th>
                <th className="px-4 py-3 text-left">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {(rows as any[]).map((row) => (
                <tr key={row.projectId} className="hover:bg-white/[0.03] transition-colors">
                  <td className="px-4 py-3 text-white/80 font-medium max-w-[160px] truncate">{row.projectName ?? `#${row.projectId}`}</td>
                  <td className="px-4 py-3 text-white/70 max-w-[180px] truncate">{row.clientName ?? "—"}</td>
                  <td className="px-4 py-3 text-white/50 text-xs">{row.clientDocType ?? "—"}</td>
                  <td className="px-4 py-3 text-white/70 font-mono text-xs">{row.clientDocNumber ?? "—"}</td>
                  <td className="px-4 py-3 text-white/60 text-xs max-w-[200px] truncate">{row.clientEmail ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-medium text-white/80 whitespace-nowrap">
                    {row.projectTotal ? `$${Number(row.projectTotal).toLocaleString("es-CO")}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-white/60">
                      {PROJECT_STATUSES[row.projectStatus] ?? row.projectStatus ?? "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-white/30 mt-2">
        * El valor mostrado es el total del proyecto. Para la factura DIAN usa el valor antes de IVA según aplique.
      </p>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function Contador() {
  const { user } = useAuth();
  const allowed = ["super_admin", "admin", "contador"].includes((user as any)?.role ?? "");

  if (!allowed) {
    return (
      <div className="flex items-center justify-center h-full py-20 text-white/40">
        <div className="text-center">
          <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Acceso restringido — solo contador y administradores</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Módulo Contador</h1>
        <p className="text-white/50 text-sm mt-1">Obligaciones tributarias · Documentos · Datos para facturación DIAN</p>
      </div>

      <Tabs defaultValue="derrotero" className="space-y-5">
        <TabsList className="bg-white/[0.06] border border-white/10 p-1 gap-1">
          <TabsTrigger value="derrotero" className="data-[state=active]:bg-teal-600/80 data-[state=active]:text-white text-white/60 gap-2">
            <CalendarCheck className="h-4 w-4" />
            Derrotero
          </TabsTrigger>
          <TabsTrigger value="documentos" className="data-[state=active]:bg-teal-600/80 data-[state=active]:text-white text-white/60 gap-2">
            <Receipt className="h-4 w-4" />
            Documentos
          </TabsTrigger>
          <TabsTrigger value="dian" className="data-[state=active]:bg-teal-600/80 data-[state=active]:text-white text-white/60 gap-2">
            <Building2 className="h-4 w-4" />
            Proyectos DIAN
          </TabsTrigger>
        </TabsList>

        <TabsContent value="derrotero"><Derrotero /></TabsContent>
        <TabsContent value="documentos"><Documentos /></TabsContent>
        <TabsContent value="dian"><ProyectosDIAN /></TabsContent>
      </Tabs>
    </div>
  );
}
