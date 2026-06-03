import { jsPDF } from 'jspdf';
import logo from '../assets/logo.png';

/* ── Gerador de Recibo PDF ──
 * Cria um documento PDF formatado com os dados do pedido, itens e pagamentos.
 * Utiliza a biblioteca jsPDF para geração client-side (sem servidor).
 * O ficheiro é descarregado automaticamente com o nome "recibo-{numero}.pdf". */
export function gerarReciboPDF(pedido) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  /* ── Cabeçalho: logo + título ── */
  doc.addImage(logo, 'PNG', margin, 12, 40, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Gestão Inteligente de Impressão e Papelaria', margin, 32);
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(1);
  doc.line(margin, 38, pageWidth - margin, 38);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 58, 95);
  doc.text('RECIBO', margin, 52);

  /* ── Informação do pedido ── */
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  let y = 70;
  doc.text(`Nº do Pedido: ${pedido.numero}`, margin, y); y += 7;
  doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-MZ')}`, margin, y); y += 7;
  doc.text(`Hora: ${new Date().toLocaleTimeString('pt-MZ')}`, margin, y); y += 12;

  /* ── Dados do cliente ── */
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 58, 95);
  doc.text('Dados do Cliente', margin, y); y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(`Nome: ${pedido.nome_cliente || pedido.cliente_nome || 'N/A'}`, margin, y); y += 7;
  y += 8;

  /* ── Cabeçalho da tabela de itens ── */
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text('#', margin, y);
  doc.text('Descrição', margin + 15, y);
  doc.text('Qtd', margin + 100, y);
  doc.text('Preço Unit.', margin + 120, y);
  doc.text('Subtotal', margin + 155, y);
  y += 4;
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  /* ── Linhas de itens do pedido ──
   * Se a posição Y ultrapassar 260, cria nova página para evitar corte. */
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  const itens = pedido.itens || [];
  itens.forEach((item, i) => {
    if (y > 260) { doc.addPage(); y = 30; }
    doc.text(String(i + 1), margin, y);
    doc.text(item.nome, margin + 15, y);
    doc.text(String(item.quantidade), margin + 100, y);
    doc.text(`${item.preco_unit?.toLocaleString()} MT`, margin + 120, y);
    doc.text(`${item.subtotal?.toLocaleString()} MT`, margin + 155, y);
    y += 7;
  });

  /* ── Total em destaque com fundo azul escuro ── */
  y += 4;
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;
  doc.setFillColor(30, 58, 95);
  doc.rect(margin, y, contentWidth, 12, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(`TOTAL: ${pedido.total?.toLocaleString()} MT`, margin + 6, y + 8);
  y += 20;

  /* ── Lista de pagamentos realizados (se houver) ── */
  if (pedido.pagamentos && pedido.pagamentos.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 58, 95);
    doc.text('Pagamentos Realizados', margin, y); y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    pedido.pagamentos.forEach((p, i) => {
      if (y > 260) { doc.addPage(); y = 30; }
      doc.text(`• ${p.metodo.toUpperCase()}${p.referencia ? ` (Ref: ${p.referencia})` : ''}: ${p.valor?.toLocaleString()} MT`, margin + 4, y);
      y += 6;
    });
    y += 4;
  }

  /* ── Observações ── */
  if (pedido.observacoes) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Obs: ${pedido.observacoes}`, margin, y);
  }

  /* ── Rodapé ── */
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.5);
  doc.line(margin, 280, pageWidth - margin, 280);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Obrigado pela preferência! • SmartPaper © 2026 • Gestão Inteligente de Impressão e Papelaria', pageWidth / 2, 288, { align: 'center' });

  /* ── Descarrega o ficheiro ── */
  doc.save(`recibo-${pedido.numero}.pdf`);
}
