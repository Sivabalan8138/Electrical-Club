import path from 'path';
import fs from 'fs';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import prisma from '../utils/db';

const TEMP_DIR = path.join(__dirname, '../../temp_reports');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Generate Attendance PDF
export const generateAttendancePDF = async (event: 'ELECTROQUEST'): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        layout: 'portrait',
        size: 'A4',
        margin: 40,
      });

      const pdfPath = path.join(TEMP_DIR, `${event}_Attendance_Sheet.pdf`);
      const writeStream = fs.createWriteStream(pdfPath);
      doc.pipe(writeStream);

      // Header
      doc
        .fillColor('#081B33')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('V.S.B. ENGINEERING COLLEGE, KARUR', { align: 'center' });

      doc.moveDown(0.3);
      doc
        .fontSize(11)
        .fillColor('#555555')
        .font('Helvetica')
        .text('DEPARTMENT OF ELECTRICAL AND ELECTRONICS ENGINEERING', { align: 'center' });

      doc.moveDown(0.3);
      doc
        .fontSize(13)
        .fillColor('#00D4FF')
        .font('Helvetica-Bold')
        .text('ELECTRICAL CLUB', { align: 'center' });

      doc.moveDown(0.4);
      doc
        .fontSize(14)
        .fillColor('#081B33')
        .font('Helvetica-Bold')
        .text(`EVENT ATTENDANCE SHEET - ${event}`, { align: 'center' });

      doc.moveDown(1.5);

      // Fetch Students
      let studentsList: Array<{
        regNo: string;
        name: string;
        dept: string;
        teamName: string;
      }> = [];

      if (event === 'ELECTROQUEST') {
        const registrations = await prisma.electroQuestRegistration.findMany({
          orderBy: { createdAt: 'asc' },
        });
        registrations.forEach((reg) => {
          studentsList.push({
            regNo: reg.member1RegisterNumber,
            name: reg.member1Name,
            dept: reg.member1Department,
            teamName: reg.teamName,
          });
          if (reg.member2RegisterNumber && reg.member2Name && reg.member2Department) {
            studentsList.push({
              regNo: reg.member2RegisterNumber,
              name: reg.member2Name,
              dept: reg.member2Department,
              teamName: reg.teamName,
            });
          }
        });
      }

      // Draw Table Header
      const tableTop = 150;
      const colWidths = { sNo: 35, regNo: 95, name: 130, dept: 65, teamName: 105, signature: 85 };
      const colX = {
        sNo: 40,
        regNo: 40 + colWidths.sNo,
        name: 40 + colWidths.sNo + colWidths.regNo,
        dept: 40 + colWidths.sNo + colWidths.regNo + colWidths.name,
        teamName: 40 + colWidths.sNo + colWidths.regNo + colWidths.name + colWidths.dept,
        signature: 40 + colWidths.sNo + colWidths.regNo + colWidths.name + colWidths.dept + colWidths.teamName,
      };

      const drawRow = (y: number, sNo: string, regNo: string, name: string, dept: string, teamName: string, sig: string, isHeader = false) => {
        doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica').fontSize(isHeader ? 10 : 9);
        doc.text(sNo, colX.sNo + 5, y + 6, { width: colWidths.sNo - 10 });
        doc.text(regNo, colX.regNo + 5, y + 6, { width: colWidths.regNo - 10 });
        doc.text(name, colX.name + 5, y + 6, { width: colWidths.name - 10 });
        doc.text(dept, colX.dept + 5, y + 6, { width: colWidths.dept - 10 });
        doc.text(teamName, colX.teamName + 5, y + 6, { width: colWidths.teamName - 10 });
        doc.text(sig, colX.signature + 5, y + 6, { width: colWidths.signature - 10 });

        // Borders
        const rowHeight = 24;
        doc.rect(colX.sNo, y, doc.page.width - 80, rowHeight).strokeColor('#666666').lineWidth(0.5).stroke();
        doc.moveTo(colX.regNo, y).lineTo(colX.regNo, y + rowHeight).stroke();
        doc.moveTo(colX.name, y).lineTo(colX.name, y + rowHeight).stroke();
        doc.moveTo(colX.dept, y).lineTo(colX.dept, y + rowHeight).stroke();
        doc.moveTo(colX.teamName, y).lineTo(colX.teamName, y + rowHeight).stroke();
        doc.moveTo(colX.signature, y).lineTo(colX.signature, y + rowHeight).stroke();
      };

      // Header row
      drawRow(tableTop, 'S.No', 'Register No', 'Student Name', 'Dept', 'Team Name', 'Signature', true);

      let currentY = tableTop + 24;
      studentsList.forEach((s, idx) => {
        // Handle new page
        if (currentY > doc.page.height - 120) {
          doc.addPage();
          currentY = 40;
          drawRow(currentY, 'S.No', 'Register No', 'Student Name', 'Dept', 'Team Name', 'Signature', true);
          currentY += 24;
        }
        drawRow(currentY, String(idx + 1), s.regNo, s.name, s.dept, s.teamName, '');
        currentY += 24;
      });

      // Signatures Footer
      const footerY = Math.max(currentY + 40, doc.page.height - 80);
      if (footerY > doc.page.height - 40) {
        doc.addPage();
      }

      doc
        .strokeColor('#cccccc')
        .moveTo(40, doc.page.height - 60)
        .lineTo(200, doc.page.height - 60)
        .stroke();
      doc
        .fillColor('#555555')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('FACULTY COORDINATOR SIGNATURE', 40, doc.page.height - 54);

      doc
        .strokeColor('#cccccc')
        .moveTo(doc.page.width - 200, doc.page.height - 60)
        .lineTo(doc.page.width - 40, doc.page.height - 60)
        .stroke();
      doc
        .text('STUDENT COORDINATOR SIGNATURE', doc.page.width - 200, doc.page.height - 54);

      doc.end();
      writeStream.on('finish', () => resolve(pdfPath));
      writeStream.on('error', (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
};

// Generate Attendance Excel Sheet using ExcelJS
export const generateAttendanceExcel = async (event: 'ELECTROQUEST'): Promise<string> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(`${event} Attendance`);

  // Document Title styling
  worksheet.mergeCells('A1:F1');
  worksheet.mergeCells('A2:F2');
  worksheet.mergeCells('A3:F3');
  worksheet.mergeCells('A4:F4');

  worksheet.getCell('A1').value = 'V.S.B. ENGINEERING COLLEGE, KARUR';
  worksheet.getCell('A2').value = 'DEPARTMENT OF ELECTRICAL AND ELECTRONICS ENGINEERING';
  worksheet.getCell('A3').value = 'ELECTRICAL CLUB';
  worksheet.getCell('A4').value = `EVENT ATTENDANCE SHEET - ${event.toUpperCase()}`;

  const centerStyle: Partial<ExcelJS.Style> = {
    alignment: { horizontal: 'center', vertical: 'middle' },
    font: { bold: true, size: 12 },
  };
  worksheet.getCell('A1').style = { ...centerStyle, font: { bold: true, size: 14 } };
  worksheet.getCell('A2').style = { ...centerStyle, font: { bold: false, color: { argb: 'FF555555' }, size: 10 } };
  worksheet.getCell('A3').style = { ...centerStyle, font: { bold: true, size: 12, color: { argb: 'FF00D4FF' } } };
  worksheet.getCell('A4').style = centerStyle;

  // Add empty row
  worksheet.addRow([]);

  // Add Headers
  const headerRow = worksheet.addRow([
    'S.No',
    'Register Number',
    'Student Name',
    'Department',
    'Team Name',
    'Student Signature',
  ]);

  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF081B33' },
    };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center' };
  });

  // Fetch Students list
  let studentsList: Array<{
    regNo: string;
    name: string;
    dept: string;
    teamName: string;
  }> = [];

  if (event === 'ELECTROQUEST') {
    const registrations = await prisma.electroQuestRegistration.findMany({
      orderBy: { createdAt: 'asc' },
    });
    registrations.forEach((reg) => {
      studentsList.push({
        regNo: reg.member1RegisterNumber,
        name: reg.member1Name,
        dept: reg.member1Department,
        teamName: reg.teamName,
      });
      if (reg.member2RegisterNumber && reg.member2Name && reg.member2Department) {
        studentsList.push({
          regNo: reg.member2RegisterNumber,
          name: reg.member2Name,
          dept: reg.member2Department,
          teamName: reg.teamName,
        });
      }
    });
  }

  // Populate data
  studentsList.forEach((s, idx) => {
    worksheet.addRow([idx + 1, s.regNo, s.name, s.dept, s.teamName, '']);
  });

  // Adjust column widths
  worksheet.columns = [
    { width: 8 },  // S.No
    { width: 18 }, // Register Number
    { width: 25 }, // Student Name
    { width: 15 }, // Department
    { width: 20 }, // Team Name
    { width: 20 }, // Student Signature
  ];

  // Add borders to cells
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 5) {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    }
  });

  // Add sign off rows
  worksheet.addRow([]);
  worksheet.addRow([]);
  const sigRow = worksheet.addRow(['', 'Faculty Coordinator Signature', '', '', 'Student Coordinator Signature', '']);
  sigRow.getCell(2).font = { bold: true };
  sigRow.getCell(5).font = { bold: true };

  const excelPath = path.join(TEMP_DIR, `${event}_Attendance_Sheet.xlsx`);
  await workbook.xlsx.writeFile(excelPath);
  return excelPath;
};
