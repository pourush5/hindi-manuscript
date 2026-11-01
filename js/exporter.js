/**
 * Kalam (कलाम) - Manuscript Export Suite
 * Provides one-click formatting for Google Docs clipboard,
 * Word/DOCX downloads, and print-ready book formatting for KDP, Notion Press, & Pothi.
 */

window.KalamExporter = (function () {
  'use strict';

  /**
   * Generates formatted HTML specifically optimized for Google Docs pasting.
   * Google Docs preserves inline styles, headings, line-height, and font families.
   */
  function buildGoogleDocsHtml(title, author, contentHtml, isFullBook = false) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
</head>
<body style="font-family: 'Noto Serif Devanagari', 'Mangal', 'Georgia', serif; font-size: 12pt; line-height: 1.6; color: #1a1a1a;">
  ${isFullBook ? `
    <div style="text-align: center; margin-top: 40pt; margin-bottom: 60pt;">
      <h1 style="font-size: 26pt; font-weight: bold; margin-bottom: 12pt; font-family: 'Noto Serif Devanagari', 'Mangal', serif;">${escapeHtml(title)}</h1>
      <h3 style="font-size: 14pt; font-weight: normal; color: #555; margin-bottom: 24pt;">लेखक: ${escapeHtml(author || 'अज्ञात')}</h3>
      <div style="page-break-after: always;"></div>
    </div>
  ` : ''}

  <div class="kalam-manuscript-section">
    ${!isFullBook ? `<h1 style="font-size: 18pt; font-weight: bold; text-align: center; margin-top: 18pt; margin-bottom: 20pt; font-family: 'Noto Serif Devanagari', 'Mangal', serif;">${escapeHtml(title)}</h1>` : ''}
    <div style="text-align: justify; text-justify: inter-word;">
      ${cleanHtmlForExport(contentHtml)}
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  function cleanHtmlForExport(html) {
    if (!html) return '';
    // Format poetry stanzas with proper stanza spacing and soft verse breaks
    let processed = html
      .replace(/<p class="poetry-stanza">/gi, '<p style="margin-bottom: 16pt; line-height: 1.5; font-style: normal;">')
      .replace(/<p>/gi, '<p style="margin-top: 0; margin-bottom: 12pt; text-indent: 1.5em; line-height: 1.6;">')
      .replace(/<p style="text-align:\s*center;?">/gi, '<p style="margin-top: 0; margin-bottom: 12pt; text-align: center; text-indent: 0; line-height: 1.6;">');

    return processed;
  }

  function convertHtmlToPlainText(html) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    // Replace <br> with newline and </p> with double newlines
    tempDiv.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
    tempDiv.querySelectorAll('p').forEach(p => p.append('\n\n'));
    return tempDiv.textContent.trim();
  }

  function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/[&<>"']/g, function (m) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[m];
    });
  }

  /**
   * One-Click Copy Chapter for Google Docs
   */
  async function copyChapterForGoogleDocs(chapterTitle, contentHtml) {
    const richHtml = buildGoogleDocsHtml(chapterTitle, '', contentHtml, false);
    const plainText = `${chapterTitle}\n\n${convertHtmlToPlainText(contentHtml)}`;

    return copyToClipboard(richHtml, plainText);
  }

  /**
   * One-Click Copy Entire Manuscript (All Chapters) for Google Docs
   */
  async function copyFullBookForGoogleDocs(project) {
    let combinedHtml = '';
    let combinedText = `${project.title}\nलेखक: ${project.author || 'अज्ञात'}\n\n`;

    project.chapters.forEach((ch, index) => {
      combinedHtml += `
        <div style="margin-top: 30pt; margin-bottom: 24pt;">
          <h2 style="font-size: 18pt; text-align: center; margin-bottom: 16pt; font-family: 'Noto Serif Devanagari', 'Mangal', serif;">${escapeHtml(ch.title)}</h2>
          ${cleanHtmlForExport(ch.contentHtml)}
        </div>
        ${index < project.chapters.length - 1 ? '<div style="page-break-after: always; height: 1px; visibility: hidden;"></div><hr style="page-break-after: always; border: none; margin: 30pt 0;">' : ''}
      `;

      combinedText += `\n\n=== ${ch.title} ===\n\n${convertHtmlToPlainText(ch.contentHtml)}\n\n`;
    });

    const fullRichHtml = buildGoogleDocsHtml(project.title, project.author, combinedHtml, true);
    return copyToClipboard(fullRichHtml, combinedText);
  }

  /**
   * Universal Clipboard Writer with Fallback
   */
  async function copyToClipboard(richHtml, plainText) {
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const htmlBlob = new Blob([richHtml], { type: 'text/html' });
        const textBlob = new Blob([plainText], { type: 'text/plain' });
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': htmlBlob,
            'text/plain': textBlob
          })
        ]);
        return { success: true };
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = plainText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
        return { success: true, fallback: true };
      }
    } catch (err) {
      console.warn('Clipboard write error, attempting fallback:', err);
      // Secondary fallback
      const textarea = document.createElement('textarea');
      textarea.value = plainText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
      return { success: true, fallback: true };
    }
  }

  /**
   * Export to Word / DOCX-Compatible File
   * Generates a fully formatted Word-compatible document (WordprocessingML / MHTML)
   * that natively opens in Microsoft Word, Google Docs, and LibreOffice.
   */
  function downloadWordDoc(filename, title, author, contentHtml) {
    const fullHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${escapeHtml(title)}</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page {
            size: 6in 9in; /* Standard US Trade / Indian Paperback format */
            margin: 1.0in 1.0in 1.0in 1.0in;
            mso-header-margin: 0.5in;
            mso-footer-margin: 0.5in;
            mso-paper-source: 0;
          }
          body {
            font-family: 'Noto Serif Devanagari', 'Mangal', 'Times New Roman', serif;
            font-size: 11pt;
            line-height: 1.6;
            color: #000000;
          }
          h1 {
            font-size: 18pt;
            text-align: center;
            margin-top: 24pt;
            margin-bottom: 18pt;
          }
          p {
            margin-top: 0pt;
            margin-bottom: 8pt;
            text-indent: 0.35in;
            text-align: justify;
          }
          .poetry-stanza {
            text-indent: 0;
            margin-bottom: 14pt;
            text-align: left;
          }
        </style>
      </head>
      <body>
        <div class="Section1">
          <h1 style="text-align: center; font-size: 20pt; margin-bottom: 12pt;">${escapeHtml(title)}</h1>
          ${author ? `<p style="text-align: center; text-indent: 0; margin-bottom: 30pt; color: #555;">लेखक: ${escapeHtml(author)}</p>` : ''}
          ${cleanHtmlForExport(contentHtml)}
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + fullHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename || 'Manuscript'}.doc`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  /**
   * Export to Plain Text (UTF-8)
   */
  function downloadPlainText(filename, content) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  /**
   * Export to Markdown
   */
  function downloadMarkdown(filename, title, contentHtml) {
    let md = `# ${title}\n\n`;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = contentHtml;

    tempDiv.childNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.tagName === 'H1') md += `# ${node.textContent}\n\n`;
        else if (node.tagName === 'H2') md += `## ${node.textContent}\n\n`;
        else if (node.tagName === 'H3') md += `### ${node.textContent}\n\n`;
        else if (node.tagName === 'P') {
          let text = node.innerHTML.replace(/<br\s*[\/]?>/gi, '  \n');
          const cleanP = document.createElement('div');
          cleanP.innerHTML = text;
          md += `${cleanP.textContent}\n\n`;
        }
      }
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return {
    copyChapterForGoogleDocs: copyChapterForGoogleDocs,
    copyFullBookForGoogleDocs: copyFullBookForGoogleDocs,
    downloadWordDoc: downloadWordDoc,
    downloadPlainText: downloadPlainText,
    downloadMarkdown: downloadMarkdown,
    convertHtmlToPlainText: convertHtmlToPlainText
  };
})();

