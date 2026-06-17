import type { Branch, TranslationResponse } from "./types";

interface GeneratePdfParams {
  activeBranch: Branch;
  docDate: string;
  docNumber: string;
  reportData: TranslationResponse;
}

export async function generatePdf({
  activeBranch,
  docDate,
  docNumber,
  reportData,
}: GeneratePdfParams): Promise<void> {
  const pdfMakeModule = await import("pdfmake/build/pdfmake");
  const pdfMake = pdfMakeModule.default || pdfMakeModule;

  const origin = window.location.origin;
  pdfMake.fonts = {
    Roboto: {
      normal: `${origin}/fonts/Roboto-Regular.ttf`,
      bold: `${origin}/fonts/Roboto-Medium.ttf`,
      italics: `${origin}/fonts/Roboto-Italic.ttf`,
      bolditalics: `${origin}/fonts/Roboto-MediumItalic.ttf`,
    },
  };
  pdfMake.vfs = {};

  const docDefinition: any = {
    header: function () {
      return {
        text: "ПОДІЇ ТА ДІЙОВІ ОСОБИ ВИГАДАНІ, РАПОРТ ЗГЕНЕРОВАНО ZGIDNO-VIDPOVIDNO.WEB.APP",
        alignment: "center",
        fontSize: 8,
        color: "#888888",
        margin: [0, 15, 0, 0],
      };
    },
    footer: function () {
      return {
        text: "ПОДІЇ ТА ДІЙОВІ ОСОБИ ВИГАДАНІ, РАПОРТ ЗГЕНЕРОВАНО ZGIDNO-VIDPOVIDNO.WEB.APP",
        alignment: "center",
        fontSize: 8,
        color: "#888888",
        margin: [0, 0, 0, 15],
      };
    },
    pageMargins: [40, 50, 40, 50],
    content: [
      // Top header (Ministry and Doc info)
      {
        columns: [
          {
            width: "*",
            stack: [
              { text: "МІНІСТЕРСТВО ОБОРОНИ УКРАЇНИ", fontSize: 9, bold: true, color: "#222222" },
              { text: `${activeBranch.toUpperCase()} (ЗСУ)`, fontSize: 8, color: "#444444", margin: [0, 2, 0, 0] },
              { text: "Військовий сегмент: СЕД V2.4", fontSize: 8, color: "#666666", margin: [0, 1, 0, 0] },
            ],
          },
          {
            width: "auto",
            alignment: "right",
            stack: [
              { text: `Вхідний №: ${docNumber}`, fontSize: 9, bold: true, color: "#111111" },
              { text: `Дата: ${docDate}`, fontSize: 8, color: "#444444", margin: [0, 2, 0, 0] },
              { text: "ДСК (ДЛЯ СЛУЖБОВОГО КОРИСТУВАННЯ)", fontSize: 8, bold: true, color: "#b85c00", margin: [0, 2, 0, 0] },
            ],
          },
        ],
      },
      // Divider
      {
        canvas: [{ type: "line", x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1, strokeColor: "#cccccc" }],
        margin: [0, 10, 0, 15],
      },
      // Document Title
      {
        text: "Р А П О Р Т",
        alignment: "center",
        fontSize: 14,
        bold: true,
        margin: [0, 15, 0, 15],
        color: "#111111",
      },
      // Report Text Body
      {
        text: reportData.report,
        fontSize: 11,
        lineHeight: 1.4,
        alignment: "justify",
        leadingIndent: 20,
        margin: [0, 0, 0, 25],
        color: "#222222",
      },
      // Resolution and Order block
      {
        table: {
          widths: ["*", "*"],
          body: [
            [
              {
                stack: [
                  { text: "Резолюція Командування:", fontSize: 8, bold: true, color: "#555555", margin: [0, 0, 0, 4] },
                  { text: reportData.resolution, fontSize: 9, italic: true, color: "#333333", lineHeight: 1.2 },
                ],
                border: [false, false, true, false],
                margin: [0, 5, 10, 5],
              },
              {
                stack: [
                  { text: "Вказівки / Наказ:", fontSize: 8, bold: true, color: "#555555", margin: [0, 0, 0, 4] },
                  { text: reportData.order, fontSize: 9, italic: true, color: "#333333", lineHeight: 1.2 },
                ],
                border: [false, false, false, false],
                margin: [10, 5, 0, 5],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: (i: number) => (i === 1 ? 1 : 0),
          vLineColor: () => "#dddddd",
        },
        margin: [0, 0, 0, 20],
      },
      // Approvers heading
      {
        text: "Електронне погодження документа (СЕД):",
        fontSize: 8,
        bold: true,
        color: "#555555",
        margin: [0, 10, 0, 5],
      },
      // Approvers list
      ...reportData.approvers.map((approver) => {
        const isApproved =
          approver.status.includes("ПОГОДЖЕНО") ||
          approver.status.includes("ВЕРИФІКОВАНО") ||
          approver.status.includes("ПІДТВЕРДЖЕНО");
        return {
          table: {
            widths: ["*", "auto"],
            body: [
              [
                { text: approver.role, fontSize: 9, color: "#333333" },
                {
                  text: approver.status,
                  fontSize: 8,
                  bold: true,
                  color: isApproved ? "#008822" : "#b85c00",
                },
              ],
            ],
          },
          layout: "lightHorizontalLines",
          margin: [0, 2, 0, 2],
        };
      }),
      // Divider
      {
        canvas: [{ type: "line", x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1, strokeColor: "#eeeeee" }],
        margin: [0, 15, 0, 15],
      },
      // Bottom Signatures & Regulations
      {
        columns: [
          {
            width: "*",
            stack: [
              { text: "Регламентуюча база:", fontSize: 8, color: "#777777" },
              { text: reportData.regulation, fontSize: 9, color: "#333333", margin: [0, 2, 0, 0] },
            ],
          },
          {
            width: "auto",
            minWidth: 180,
            stack: [
              {
                table: {
                  widths: ["*"],
                  body: [
                    [
                      {
                        stack: [
                          { text: reportData.authorized_by, fontSize: 9, bold: true, color: "#111111", alignment: "center" },
                          { text: "Електронний підпис (ЕЦП)", fontSize: 7, color: "#777777", alignment: "center", margin: [0, 2, 0, 0] },
                          {
                            text: "ЗАТВЕРДЖЕНО",
                            fontSize: 8,
                            bold: true,
                            color: "#008822",
                            alignment: "center",
                            margin: [0, 4, 0, 0],
                          },
                        ],
                        margin: [10, 10, 10, 10],
                        fillColor: "#f9fbf9",
                      },
                    ],
                  ],
                },
                layout: {
                  hLineWidth: () => 1,
                  vLineWidth: () => 1,
                  hLineColor: () => "#dddddd",
                  vLineColor: () => "#dddddd",
                },
              },
            ],
          },
        ],
      },
      // Operation Code
      {
        text: `OPERATION CODE: ${reportData.operation_code}`,
        fontSize: 8,
        bold: true,
        color: "#555555",
        margin: [0, 15, 0, 0],
        alignment: "right",
      },
    ],
    defaultStyle: {
      font: "Roboto",
    },
  };

  pdfMake.createPdf(docDefinition).download(`Рапорт_${docNumber}.pdf`);
}
