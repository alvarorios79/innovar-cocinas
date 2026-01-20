#!/usr/bin/env python3
"""
Módulo para generar PDFs de cotizaciones de INNOVAR Cocinas Integrales
"""

import sys
import json
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.platypus import Table, TableStyle
from reportlab.lib.utils import ImageReader
import os

# Colores corporativos INNOVAR
INNOVAR_TURQUOISE = colors.HexColor('#14B8A6')
GRAY_LIGHT = colors.HexColor('#F3F4F6')

def format_currency(amount):
    """Formatear número como moneda colombiana"""
    try:
        num = float(amount)
        return f"${num:,.0f}".replace(",", ".")
    except:
        return str(amount)

def draw_header(c, logo_path):
    """Dibujar encabezado con logo e información de contacto"""
    # Logo
    if os.path.exists(logo_path):
        try:
            logo = ImageReader(logo_path)
            c.drawImage(logo, 0.5*inch, 10*inch, width=1.1*inch, height=1.4*inch, preserveAspectRatio=True, mask='auto')
        except Exception as e:
            print(f"Error loading logo: {e}", file=sys.stderr)
    
    # Información de contacto (derecha)
    c.setFont("Helvetica", 9)
    c.drawRightString(8*inch, 10.9*inch, "K9 vía Cerritos a Pereira")
    c.drawRightString(8*inch, 10.6*inch, "313 680 2025")
    c.drawRightString(8*inch, 10.3*inch, "innovarcocinasintegrales@gmail.com")
    c.drawRightString(8*inch, 10*inch, "Cuenta: 0000000000 - Banco")

def draw_quotation_info(c, quotation_data):
    """Dibujar información de la cotización"""
    # Número y fecha (arriba a la derecha)
    c.setFont("Helvetica-Bold", 10)
    c.drawRightString(8*inch, 9.5*inch, f"Cotización N° {quotation_data['quotationNumber']}")
    c.setFont("Helvetica", 9)
    c.drawRightString(8*inch, 9.2*inch, f"Fecha: {quotation_data['date']}")
    
    # Cliente (recuadro turquesa)
    c.setFillColor(INNOVAR_TURQUOISE)
    c.rect(0.5*inch, 8.6*inch, 7.5*inch, 0.35*inch, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(0.6*inch, 8.75*inch, f"CLIENTE: {quotation_data['clientName']}")
    
    # Fila de información del proyecto
    c.setFillColor(INNOVAR_TURQUOISE)
    c.rect(0.5*inch, 8.1*inch, 7.5*inch, 0.35*inch, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica", 8)
    c.drawString(0.6*inch, 8.25*inch, f"VENDEDOR: {quotation_data['vendorName']}")
    c.drawString(2.5*inch, 8.25*inch, f"TRABAJO: {quotation_data['workType']}")
    c.drawString(4.8*inch, 8.25*inch, f"FORMA DE PAGO: 60% inicial, 40% final")
    c.drawString(7*inch, 8.25*inch, f"VENCIMIENTO: {quotation_data['validUntil']}")
    
    c.setFillColor(colors.black)

def draw_items_table(c, items, y_position):
    """Dibujar tabla de items"""
    # Encabezado de tabla
    c.setFillColor(INNOVAR_TURQUOISE)
    c.rect(0.5*inch, y_position, 7.5*inch, 0.3*inch, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(0.6*inch, y_position + 0.1*inch, "ÍTEM")
    c.drawString(1.2*inch, y_position + 0.1*inch, "DESCRIPCIÓN")
    c.drawString(5.5*inch, y_position + 0.1*inch, "CANTIDAD")
    c.drawString(6.5*inch, y_position + 0.1*inch, "P. UNITARIO")
    c.drawRightString(7.9*inch, y_position + 0.1*inch, "TOTAL")
    
    c.setFillColor(colors.black)
    y_position -= 0.3*inch
    
    # Items
    for idx, item in enumerate(items):
        # Fila alternada
        if idx % 2 == 0:
            c.setFillColor(GRAY_LIGHT)
            c.rect(0.5*inch, y_position - 0.05*inch, 7.5*inch, -0.4*inch, fill=1, stroke=0)
            c.setFillColor(colors.black)
        
        c.setFont("Helvetica-Bold", 9)
        c.drawString(0.6*inch, y_position, str(item['itemNumber']))
        
        # Descripción (puede ser multilínea)
        c.setFont("Helvetica", 8)
        description_lines = item['description'].split('\n')
        for i, line in enumerate(description_lines[:3]):  # Máximo 3 líneas
            c.drawString(1.2*inch, y_position - (i * 0.12*inch), line[:60])
        
        c.setFont("Helvetica", 9)
        c.drawString(5.5*inch, y_position, item['quantity'])
        if item.get('unitPrice'):
            c.drawString(6.5*inch, y_position, item['unitPrice'])
        c.drawRightString(7.9*inch, y_position, format_currency(item['totalPrice']))
        
        y_position -= 0.5*inch
        
        # Si llegamos al final de la página, crear nueva página
        if y_position < 2*inch:
            c.showPage()
            y_position = 10.5*inch
            draw_items_table_header(c, y_position)
            y_position -= 0.3*inch
    
    return y_position

def draw_items_table_header(c, y_position):
    """Dibujar encabezado de tabla en páginas adicionales"""
    c.setFillColor(INNOVAR_TURQUOISE)
    c.rect(0.5*inch, y_position, 7.5*inch, 0.3*inch, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(0.6*inch, y_position + 0.1*inch, "ÍTEM")
    c.drawString(1.2*inch, y_position + 0.1*inch, "DESCRIPCIÓN")
    c.drawString(5.5*inch, y_position + 0.1*inch, "CANTIDAD")
    c.drawString(6.5*inch, y_position + 0.1*inch, "P. UNITARIO")
    c.drawRightString(7.9*inch, y_position + 0.1*inch, "TOTAL")
    c.setFillColor(colors.black)

def draw_totals(c, quotation_data, y_position):
    """Dibujar sección de totales"""
    y_position -= 0.5*inch
    
    # Subtotal
    c.setFont("Helvetica", 10)
    c.drawString(5.5*inch, y_position, "Subtotal:")
    c.drawRightString(7.9*inch, y_position, format_currency(quotation_data['subtotal']))
    
    y_position -= 0.25*inch
    
    # Costos fijos
    c.drawString(5.5*inch, y_position, "Transporte e imprevistos:")
    c.drawRightString(7.9*inch, y_position, format_currency(quotation_data['fixedCosts']))
    
    y_position -= 0.4*inch
    
    # Total (destacado)
    c.setFillColor(INNOVAR_TURQUOISE)
    c.rect(5.3*inch, y_position - 0.05*inch, 2.7*inch, 0.4*inch, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(5.5*inch, y_position + 0.05*inch, "TOTAL:")
    c.drawRightString(7.9*inch, y_position + 0.05*inch, format_currency(quotation_data['total']))
    
    c.setFillColor(colors.black)
    return y_position

def draw_terms(c, y_position):
    """Dibujar términos y condiciones"""
    y_position -= 0.7*inch
    
    c.setFont("Helvetica-Bold", 11)
    c.drawString(0.5*inch, y_position, "TÉRMINOS Y CONDICIONES")
    
    y_position -= 0.25*inch
    c.setFont("Helvetica", 9)
    
    terms = [
        "• Forma de pago: 60% inicial, 40% al finalizar obra",
        "• Tiempo de entrega: 25 días hábiles después de aprobar el diseño",
        "• NO incluye: Obra civil, plomería, instalación de gas",
        "• Validez de la cotización: 1 semana",
        "• Garantía: 6 meses en herrajes",
    ]
    
    for term in terms:
        c.drawString(0.5*inch, y_position, term)
        y_position -= 0.2*inch
    
    return y_position

def draw_signatures(c, y_position):
    """Dibujar sección de firmas"""
    y_position -= 0.5*inch
    
    # Líneas de firma
    c.line(0.5*inch, y_position, 3*inch, y_position)
    c.line(5*inch, y_position, 7.5*inch, y_position)
    
    y_position -= 0.2*inch
    c.setFont("Helvetica", 9)
    c.drawCentredString(1.75*inch, y_position, "Firma del Cliente")
    c.drawCentredString(6.25*inch, y_position, "INNOVAR Cocinas Integrales")
    
    return y_position

def draw_footer(c, y_position):
    """Dibujar pie de página"""
    y_position -= 0.5*inch
    c.setFillColor(INNOVAR_TURQUOISE)
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(4.25*inch, y_position, "Gracias por contar con nuestros servicios")
    c.setFillColor(colors.black)

def generate_quotation_pdf(data, output_path):
    """
    Generar PDF de cotización
    
    Args:
        data: Diccionario con datos de la cotización
        output_path: Ruta donde guardar el PDF
    """
    c = canvas.Canvas(output_path, pagesize=letter)
    
    # Logo path
    logo_path = "/home/ubuntu/innovar_cocinas/innovar_logo.png"
    
    # Página 1
    draw_header(c, logo_path)
    draw_quotation_info(c, data)
    
    # Tabla de items
    y_position = draw_items_table(c, data['items'], 7.7*inch)
    
    # Totales
    y_position = draw_totals(c, data, y_position)
    
    # Términos y condiciones
    y_position = draw_terms(c, y_position)
    
    # Firmas
    y_position = draw_signatures(c, y_position)
    
    # Footer
    draw_footer(c, y_position)
    
    c.save()
    print(f"PDF generado exitosamente: {output_path}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python3 generate_quotation_pdf.py <json_data>", file=sys.stderr)
        sys.exit(1)
    
    try:
        data = json.loads(sys.argv[1])
        output_path = sys.argv[2] if len(sys.argv) > 2 else "/tmp/quotation.pdf"
        generate_quotation_pdf(data, output_path)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
