function responsiveTables(html) {
  return html.replace(/<table\b([^>]*class="[^"]*\btable-compare\b[^"]*"[^>]*)>([\s\S]*?)<\/table>/g, (table, attrs, body) => {
    const head = body.match(/<thead\b[^>]*>([\s\S]*?)<\/thead>/i);
    if (!head) return table;
    const labels = [...head[1].matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)]
      .map(m => m[1].replace(/<[^>]*>/g, '').trim());
    if (labels.length < 4) return table;
    attrs = attrs.replace('table-compare', 'table-compare table--stacked');
    if (!/\brole=/.test(attrs)) attrs += ' role="table"';
    body = body.replace(/<tbody\b([^>]*)>([\s\S]*?)<\/tbody>/gi, (_, tbodyAttrs, rows) => {
      rows = rows.replace(/<tr\b([^>]*)>([\s\S]*?)<\/tr>/gi, (_, rowAttrs, cells) => {
        let column = 0;
        cells = cells.replace(/<(th|td)\b([^>]*)>([\s\S]*?)<\/\1>/gi, (_, tag, cellAttrs, value) => {
          const label = (labels[column++] || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
          const role = tag.toLowerCase() === 'th' ? 'rowheader' : 'cell';
          return '<' + tag + cellAttrs + ' data-label="' + label + '" role="' + role + '"><span class="table-cell-value">' + value + '</span></' + tag + '>';
        });
        return '<tr' + rowAttrs + ' role="row">' + cells + '</tr>';
      });
      return '<tbody' + tbodyAttrs + ' role="rowgroup">' + rows + '</tbody>';
    });
    return '<table' + attrs + '>' + body + '</table>';
  });
}
module.exports = { responsiveTables };
