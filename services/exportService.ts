import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Transaction, CreditCard, TransactionType } from '../types';

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const formatDate = (iso: string) => 
  new Date(iso).toLocaleDateString('pt-BR');

const getCardName = (cardId: string | undefined, cards: CreditCard[]) => {
  if (!cardId) return 'N/A';
  const card = cards.find(c => c.id === cardId);
  return card ? card.name : 'Unknown Card';
};

export const exportToPDF = (transactions: Transaction[], cards: CreditCard[]) => {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(18);
  doc.text('Relatório de Gastos - CC-Expense', 14, 22);
  
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 30);
  doc.text(`Total de Registros: ${transactions.length}`, 14, 35);

  // Data Preparation
  const tableData = transactions.map(t => [
    formatDate(t.date),
    t.description,
    getCardName(t.cardId, cards),
    t.category,
    t.type === TransactionType.INCOME ? `+ ${formatCurrency(t.amount)}` : `- ${formatCurrency(t.amount)}`
  ]);

  // Calculations
  const totalIncome = transactions
    .filter(t => t.type === TransactionType.INCOME)
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpense = transactions
    .filter(t => t.type === TransactionType.EXPENSE)
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalIncome - totalExpense;

  // Table
  autoTable(doc, {
    startY: 40,
    head: [['Data', 'Descrição', 'Cartão/Método', 'Categoria', 'Valor']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229] }, // Indigo-600
    styles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 25 }, // Date
      4: { cellWidth: 35, halign: 'right' }, // Amount
    },
    didParseCell: (data) => {
        // Colorize amounts
        if (data.section === 'body' && data.column.index === 4) {
            const rawValue = tableData[data.row.index][4] as string;
            if (rawValue.startsWith('+')) {
                data.cell.styles.textColor = [5, 150, 105]; // Emerald
            } else {
                data.cell.styles.textColor = [220, 38, 38]; // Red
            }
        }
    }
  });

  // Footer / Summary
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  
  doc.setFontSize(10);
  doc.text('Resumo:', 14, finalY);
  doc.text(`Receitas Totais: ${formatCurrency(totalIncome)}`, 14, finalY + 6);
  doc.text(`Despesas Totais: ${formatCurrency(totalExpense)}`, 14, finalY + 12);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Saldo Líquido: ${formatCurrency(netBalance)}`, 14, finalY + 20);

  doc.save(`cc-expense-relatorio-${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportToExcel = (transactions: Transaction[], cards: CreditCard[]) => {
  const wsData = transactions.map(t => ({
    'Data': formatDate(t.date),
    'Descrição': t.description,
    'Cartão': getCardName(t.cardId, cards),
    'Categoria': t.category,
    'Tipo': t.type,
    'Status': t.status,
    'Valor': t.type === TransactionType.INCOME ? t.amount : -t.amount,
  }));

  const worksheet = XLSX.utils.json_to_sheet(wsData);
  const workbook = XLSX.utils.book_new();
  
  XLSX.utils.book_append_sheet(workbook, worksheet, "Transações");

  // Auto-width adjustment (simple approximation)
  const wscols = [
    { wch: 12 }, // Date
    { wch: 30 }, // Desc
    { wch: 20 }, // Card
    { wch: 15 }, // Category
    { wch: 10 }, // Type
    { wch: 10 }, // Status
    { wch: 12 }, // Amount
  ];
  worksheet['!cols'] = wscols;

  XLSX.writeFile(workbook, `cc-expense-relatorio-${new Date().toISOString().split('T')[0]}.xlsx`);
};