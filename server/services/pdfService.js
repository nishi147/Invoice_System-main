import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';

export const generateInvoicePDF = async (invoice, settings) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      // 1. Template & Color Palette Configurations
      const template = invoice.templateType || 'modern';
      
      // Default: Modern Elegant Indigo / Slate Navy theme
      let theme = {
        primary: '#2563eb',      // Royal Blue
        primaryDark: '#1e40af',  // Deep Blue
        text: '#0f172a',         // Dark Slate
        textMuted: '#64748b',    // Muted Slate
        lightBg: '#f8fafc',      // Soft Slate Light Fill
        cardBg: '#f1f5f9',       // Subtle Card Background
        border: '#e2e8f0',       // Border Slate
        line: '#cbd5e1',         // Separator line
      };

      if (template === 'corporate') {
        theme = {
          primary: '#0f172a',      // Executive Dark Slate
          primaryDark: '#020617',
          text: '#0f172a',
          textMuted: '#475569',
          lightBg: '#f8fafc',
          cardBg: '#f1f5f9',
          border: '#cbd5e1',
          line: '#94a3b8',
        };
      } else if (template === 'classic') {
        theme = {
          primary: '#1e293b',      // Charcoal Slate
          primaryDark: '#0f172a',
          text: '#334155',
          textMuted: '#64748b',
          lightBg: '#fafafa',
          cardBg: '#f4f4f5',
          border: '#e4e4e7',
          line: '#d4d4d8',
        };
      } else if (template === 'minimal') {
        theme = {
          primary: '#18181b',      // Pitch Charcoal
          primaryDark: '#09090b',
          text: '#18181b',
          textMuted: '#71717a',
          lightBg: '#ffffff',
          cardBg: '#f4f4f5',
          border: '#e4e4e7',
          line: '#e4e4e7',
        };
      }

      const clientInfo = invoice.clientDetailsSnapshot || invoice.client || {};

      // 2. Generate QR Code Buffer
      const portalUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/portal/invoice/${invoice.sharingToken}`;
      let qrBuffer = null;
      try {
        qrBuffer = await QRCode.toBuffer(portalUrl, { margin: 1, width: 80 });
      } catch (qrErr) {
        console.error('QR code generation failed, skipping QR code in PDF:', qrErr);
      }

      // 3. Header Styling based on template type
      if (template === 'corporate') {
        // Executive Top Bar
        doc.rect(0, 0, 595.28, 12).fill(theme.primary);
      } else if (template === 'modern') {
        // Modern Left Accent Pill
        doc.roundedRect(50, 48, 4, 46, 2).fill(theme.primary);
      }

      // Check if logo image exists
      const logoX = template === 'modern' ? 62 : 50;
      const headerStartY = template === 'corporate' ? 52 : (template === 'modern' ? 48 : 50);
      
      const possibleLogoPaths = [
        path.join(process.cwd(), 'client/public/logo.png'),
        path.join(process.cwd(), '../client/public/logo.png'),
        path.join(process.cwd(), 'public/logo.png'),
      ];
      const logoPath = possibleLogoPaths.find((p) => fs.existsSync(p));

      let companyY = headerStartY;

      if (logoPath) {
        try {
          doc.image(logoPath, logoX, headerStartY, { height: 32 });
          companyY = headerStartY + 38;
        } catch (imgErr) {
          console.error('Failed to render logo in PDF:', imgErr);
          doc.fillColor(template === 'modern' ? theme.primary : theme.text);
          doc.font('Helvetica-Bold').fontSize(18).text(settings.name || 'Company Name', logoX, headerStartY, { width: 320 });
          companyY = doc.y + 4;
        }
      } else {
        doc.fillColor(template === 'modern' ? theme.primary : theme.text);
        doc.font('Helvetica-Bold').fontSize(18).text(settings.name || 'Company Name', logoX, headerStartY, { width: 320 });
        companyY = doc.y + 4;
      }

      const leftX = logoX;
      const rightX = 390;
      const colWidth = 320;

      // Draw Left Column: Company Details
      doc.font('Helvetica').fontSize(8.5).fillColor(theme.textMuted);
      if (settings.address?.street) {
        doc.text(settings.address.street, leftX, companyY, { width: colWidth });
        companyY = doc.y + 1.5;
      }
      const cityStateZip = `${settings.address?.city || ''}, ${settings.address?.state || ''} ${settings.address?.zipCode || ''}`.trim();
      if (cityStateZip && cityStateZip !== ',') {
        doc.text(cityStateZip, leftX, companyY, { width: colWidth });
        companyY = doc.y + 1.5;
      }
      if (settings.address?.country) {
        doc.text(settings.address.country, leftX, companyY, { width: colWidth });
        companyY = doc.y + 1.5;
      }
      if (settings.phone) {
        doc.text(`Phone: ${settings.phone}`, leftX, companyY, { width: colWidth });
        companyY = doc.y + 1.5;
      }
      if (settings.email) {
        doc.text(`Email: ${settings.email}`, leftX, companyY, { width: colWidth });
        companyY = doc.y + 1.5;
      }
      if (settings.gstNumber) {
        doc.text(`GSTIN: ${settings.gstNumber}`, leftX, companyY, { width: colWidth });
        companyY = doc.y + 1.5;
      }
      if (settings.panNumber) {
        doc.text(`PAN: ${settings.panNumber}`, leftX, companyY, { width: colWidth });
        companyY = doc.y + 1.5;
      }

      const leftY = companyY;

      // Draw Right Column: Invoice Title & Meta Details
      doc.fillColor(theme.primary);
      doc.font('Helvetica-Bold').fontSize(22).text('INVOICE', rightX, headerStartY, { align: 'right', width: 155 });
      
      const metaY = headerStartY + 28;
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(theme.text)
         .text(`# ${invoice.invoiceNumber || ''}`, rightX, metaY, { align: 'right', width: 155 });
      
      doc.font('Helvetica').fontSize(8.5).fillColor(theme.textMuted)
         .text(`Date: ${invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}`, rightX, metaY + 14, { align: 'right', width: 155 })
         .text(`Due Date: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}`, rightX, metaY + 26, { align: 'right', width: 155 });

      // Status Badge on Top Right
      const statusText = (invoice.status || 'DRAFT').toUpperCase().replace('_', ' ');
      doc.font('Helvetica-Bold').fontSize(8).fillColor(theme.primary)
         .text(`STATUS: ${statusText}`, rightX, metaY + 38, { align: 'right', width: 155 });

      const rightY = metaY + 52;
      const headerEndY = Math.max(leftY, rightY);

      // Horizontal Divider Line
      const lineY = headerEndY + 12;
      doc.strokeColor(theme.border).lineWidth(1).moveTo(50, lineY).lineTo(545, lineY).stroke();

      // 4. Client Billing Info & Payment Details
      const billingY = lineY + 16;

      // Draw Left Column: BILLED TO Header
      doc.font('Helvetica-Bold').fontSize(8).fillColor(theme.textMuted).text('BILLED TO', 50, billingY);
      let clientY = billingY + 14;

      doc.font('Helvetica-Bold').fontSize(11).fillColor(theme.text).text(clientInfo.name || '', 50, clientY, { width: 320 });
      clientY = doc.y + 2;

      doc.font('Helvetica').fontSize(8.5).fillColor(theme.textMuted);
      if (clientInfo.company) {
        doc.text(clientInfo.company, 50, clientY, { width: 320 });
        clientY = doc.y + 1.5;
      }
      if (clientInfo.address?.street) {
        doc.text(clientInfo.address.street, 50, clientY, { width: 320 });
        clientY = doc.y + 1.5;
      }
      const clientCityStateZip = `${clientInfo.address?.city || ''}, ${clientInfo.address?.state || ''} ${clientInfo.address?.zipCode || ''}`.trim();
      if (clientCityStateZip && clientCityStateZip !== ',') {
        doc.text(clientCityStateZip, 50, clientY, { width: 320 });
        clientY = doc.y + 1.5;
      }
      if (clientInfo.address?.country) {
        doc.text(clientInfo.address.country, 50, clientY, { width: 320 });
        clientY = doc.y + 1.5;
      }
      if (clientInfo.email) {
        doc.text(`Email: ${clientInfo.email}`, 50, clientY, { width: 320 });
        clientY = doc.y + 1.5;
      }
      if (clientInfo.phone) {
        doc.text(`Phone: ${clientInfo.phone}`, 50, clientY, { width: 320 });
        clientY = doc.y + 1.5;
      }
      if (clientInfo.gstNumber) {
        doc.text(`GSTIN: ${clientInfo.gstNumber}`, 50, clientY, { width: 320 });
        clientY = doc.y + 1.5;
      }

      const billedToEndY = clientY;

      // Draw Right Column: PAYMENT DETAILS Card Box
      doc.roundedRect(390, billingY, 155, 54, 6).fill(theme.lightBg).stroke(theme.border);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(theme.primary).text('PAYMENT DETAILS', 402, billingY + 10, { width: 130 });
      doc.font('Helvetica').fontSize(8.5).fillColor(theme.textMuted)
         .text(`Currency: ${invoice.currency || 'INR'}`, 402, billingY + 23, { width: 130 });
      doc.font('Helvetica-Bold').fontSize(9).fillColor(theme.text)
         .text(`Balance Due: ${invoice.currency || 'INR'} ${(invoice.balanceDue || 0).toFixed(2)}`, 402, billingY + 36, { width: 130 });

      const paymentDetailsEndY = billingY + 60;

      // 5. Items Table
      const tableY = Math.max(billedToEndY, paymentDetailsEndY) + 16;

      const renderTableHeader = (y) => {
        doc.roundedRect(50, y, 495, 22, 4).fill(theme.lightBg);
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(theme.text);
        doc.text('ITEM DETAILS', 62, y + 7, { width: 175, align: 'left' });
        doc.text('QTY', 240, y + 7, { width: 50, align: 'center' });
        doc.text('RATE', 290, y + 7, { width: 70, align: 'right' });
        doc.text('GST %', 365, y + 7, { width: 60, align: 'right' });
        doc.text('AMOUNT', 430, y + 7, { width: 105, align: 'right' });
      };

      // Draw initial table header
      renderTableHeader(tableY);

      let currentY = tableY + 22;

      (invoice.items || []).forEach((item, index) => {
        doc.font('Helvetica-Bold').fontSize(8.5);
        const nameHeight = doc.heightOfString(item.itemName || '', { width: 175 });
        
        let descHeight = 0;
        if (item.description) {
          doc.font('Helvetica').fontSize(7.5);
          descHeight = doc.heightOfString(item.description, { width: 175 });
        }
        
        const contentHeight = nameHeight + (descHeight > 0 ? descHeight + 2 : 0);
        const rowHeight = Math.max(26, contentHeight + 10);

        // Check page overflow
        if (currentY + rowHeight > 730) {
          doc.addPage();
          currentY = 50;
          renderTableHeader(currentY);
          currentY += 22;
        }

        // Alternate row background
        if (index % 2 === 1 && template !== 'minimal') {
          doc.rect(50, currentY, 495, rowHeight).fill('#fafafa');
        }

        // Row Separator Line
        doc.strokeColor('#f1f5f9').lineWidth(0.5).moveTo(50, currentY + rowHeight).lineTo(545, currentY + rowHeight).stroke();

        // Render Item Name
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(theme.text);
        doc.text(item.itemName || '', 62, currentY + 7, { width: 175 });
        
        // Render Item Description
        if (item.description) {
          doc.font('Helvetica').fontSize(7.5).fillColor(theme.textMuted);
          doc.text(item.description, 62, currentY + 7 + nameHeight + 2, { width: 175 });
        }

        // Render numeric columns
        doc.font('Helvetica').fontSize(8.5).fillColor(theme.text);
        doc.text((item.quantity || 0).toString(), 240, currentY + 7, { width: 50, align: 'center' });
        doc.text((item.rate || 0).toFixed(2), 290, currentY + 7, { width: 70, align: 'right' });
        doc.text(`${item.taxRate || 0}%`, 365, currentY + 7, { width: 60, align: 'right' });
        doc.font('Helvetica-Bold').text((item.amount || 0).toFixed(2), 430, currentY + 7, { width: 105, align: 'right' });

        currentY += rowHeight;
      });

      // Check page overflow before summary
      if (currentY > 600) {
        doc.addPage();
        currentY = 50;
      }

      currentY += 12;

      // 6. Summary and Calculations Block
      const sumLabelX = 330;
      const sumValX = 430;
      const labelWidth = 95;
      const valWidth = 105;
      const curr = invoice.currency || 'INR';

      doc.font('Helvetica').fontSize(8.5).fillColor(theme.textMuted);

      doc.text('Subtotal:', sumLabelX, currentY, { width: labelWidth, align: 'left' });
      doc.font('Helvetica-Bold').fillColor(theme.text).text(`${curr} ${(invoice.subtotal || 0).toFixed(2)}`, sumValX, currentY, { width: valWidth, align: 'right' });
      currentY += 16;

      if (invoice.taxAmount > 0) {
        doc.font('Helvetica').fillColor(theme.textMuted).text('GST / Tax:', sumLabelX, currentY, { width: labelWidth, align: 'left' });
        doc.font('Helvetica-Bold').fillColor(theme.text).text(`${curr} ${invoice.taxAmount.toFixed(2)}`, sumValX, currentY, { width: valWidth, align: 'right' });
        currentY += 16;
      }

      if (invoice.discountAmount > 0) {
        doc.font('Helvetica').fillColor(theme.textMuted).text(`Discount (${invoice.discountRate || 0}%):`, sumLabelX, currentY, { width: labelWidth, align: 'left' });
        doc.font('Helvetica-Bold').fillColor('#059669').text(`- ${curr} ${invoice.discountAmount.toFixed(2)}`, sumValX, currentY, { width: valWidth, align: 'right' });
        currentY += 16;
      }

      if (invoice.tdsAmount > 0) {
        doc.font('Helvetica').fillColor(theme.textMuted).text(`TDS (${invoice.tdsRate || 0}%):`, sumLabelX, currentY, { width: labelWidth, align: 'left' });
        doc.font('Helvetica-Bold').fillColor('#dc2626').text(`- ${curr} ${invoice.tdsAmount.toFixed(2)}`, sumValX, currentY, { width: valWidth, align: 'right' });
        currentY += 16;
      }

      // Grand Total Highlight Bar
      doc.roundedRect(325, currentY - 2, 220, 24, 5).fill(theme.primary);
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#ffffff');
      doc.text('Grand Total:', sumLabelX, currentY + 4, { width: labelWidth, align: 'left' });
      doc.text(`${curr} ${(invoice.grandTotal || 0).toFixed(2)}`, sumValX, currentY + 4, { width: valWidth, align: 'right' });
      currentY += 30;

      doc.font('Helvetica').fontSize(8.5).fillColor(theme.textMuted);
      doc.text('Paid Amount:', sumLabelX, currentY, { width: labelWidth, align: 'left' });
      doc.font('Helvetica-Bold').fillColor(theme.text).text(`${curr} ${(invoice.paidAmount || 0).toFixed(2)}`, sumValX, currentY, { width: valWidth, align: 'right' });
      currentY += 16;

      doc.font('Helvetica-Bold').fontSize(9).fillColor(theme.text).text('Balance Due:', sumLabelX, currentY, { width: labelWidth, align: 'left' });
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(theme.primary).text(`${curr} ${(invoice.balanceDue || 0).toFixed(2)}`, sumValX, currentY, { width: valWidth, align: 'right' });
      currentY += 24;

      // 7. Footer details (Bank details, Notes, Signatures)
      let footerY = currentY + 30;

      if (footerY + 75 > 790) {
        doc.addPage();
        footerY = 50;
      }

      const hasBank = settings.bankDetails && settings.bankDetails.bankName;
      const hasNotes = Boolean(invoice.notes);

      let notesX = 50;
      let notesWidth = 320;

      if (hasBank) {
        doc.font('Helvetica-Bold').fontSize(8).fillColor(theme.primary).text('BANK DETAILS', 50, footerY);
        doc.font('Helvetica').fontSize(7.5).fillColor(theme.textMuted)
           .text(`A/C Name: ${settings.bankDetails.accountName || ''}`, 50, footerY + 12, { width: 150 })
           .text(`A/C No: ${settings.bankDetails.accountNumber || ''}`, 50, doc.y + 1, { width: 150 })
           .text(`Bank: ${settings.bankDetails.bankName || ''}`, 50, doc.y + 1, { width: 150 })
           .text(`IFSC: ${settings.bankDetails.ifscCode || ''}`, 50, doc.y + 1, { width: 150 });
        if (settings.bankDetails.swiftCode) {
          doc.text(`SWIFT: ${settings.bankDetails.swiftCode}`, 50, doc.y + 1, { width: 150 });
        }

        notesX = 210;
        notesWidth = 180;
      }

      if (hasNotes) {
        doc.font('Helvetica-Bold').fontSize(8).fillColor(theme.primary).text('NOTES & TERMS', notesX, footerY);
        doc.font('Helvetica').fontSize(7.5).fillColor(theme.textMuted).text(invoice.notes, notesX, footerY + 12, { width: notesWidth });
      }

      // Right side of Footer: Authorized Signature Line
      const sigX = 420;
      const sigWidth = 125;

      doc.strokeColor(theme.border).lineWidth(0.75).moveTo(sigX, footerY + 42).lineTo(545, footerY + 42).stroke();
      doc.font('Helvetica-Bold').fontSize(8).fillColor(theme.text).text('Authorized Signature', sigX, footerY + 47, { align: 'center', width: sigWidth });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};


