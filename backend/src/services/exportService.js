const PDFDocument = require('pdfkit');
const { createObjectCsvWriter } = require('csv-writer');
const fs = require('fs');
const path = require('path');

/**
 * Export depth chart as PDF
 */
async function exportDepthChartPDF(depthChart, dynastyInfo) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      const filename = `depth-chart-${dynastyInfo.team_name.replace(/\s+/g, '-')}-${Date.now()}.pdf`;
      const filepath = path.join(__dirname, '../../uploads', filename);

      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      // Title
      doc.fontSize(20).text(`${dynastyInfo.team_name} Depth Chart`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Season: ${dynastyInfo.season_year || 'N/A'}`, { align: 'center' });
      doc.moveDown(2);

      // Organize by unit
      const units = {
        'Offense': ['QB', 'RB', 'FB', 'WR', 'TE', 'LT', 'LG', 'C', 'RG', 'RT'],
        'Defense': ['LE', 'DT', 'RE', 'LOLB', 'MLB', 'ROLB', 'CB', 'FS', 'SS'],
        'Special Teams': ['K', 'P']
      };

      for (const [unit, positions] of Object.entries(units)) {
        doc.fontSize(16).text(unit, { underline: true });
        doc.moveDown();

        positions.forEach(pos => {
          if (depthChart[pos] && depthChart[pos].length > 0) {
            doc.fontSize(12).text(`${pos}:`, { continued: false });
            
            depthChart[pos].forEach((player, index) => {
              const depthLabel = index === 0 ? '1st' : index === 1 ? '2nd' : `${index + 1}th`;
              doc.fontSize(10)
                .text(`  ${depthLabel}: ${player.first_name} ${player.last_name} (${player.overall_rating} OVR, ${player.year})`, 
                  { indent: 20 });
            });
            doc.moveDown(0.5);
          }
        });
        doc.moveDown();
      }

      doc.end();

      stream.on('finish', () => {
        resolve({ filename, filepath });
      });

      stream.on('error', reject);

    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Export depth chart as CSV
 */
async function exportDepthChartCSV(depthChart, dynastyInfo) {
  try {
    const filename = `depth-chart-${dynastyInfo.team_name.replace(/\s+/g, '-')}-${Date.now()}.csv`;
    const filepath = path.join(__dirname, '../../uploads', filename);

    const records = [];

    Object.entries(depthChart).forEach(([position, players]) => {
      players.forEach((player, index) => {
        records.push({
          position,
          depth_order: index + 1,
          player_name: `${player.first_name} ${player.last_name}`,
          overall_rating: player.overall_rating,
          year: player.year
        });
      });
    });

    const csvWriter = createObjectCsvWriter({
      path: filepath,
      header: [
        { id: 'position', title: 'Position' },
        { id: 'depth_order', title: 'Depth' },
        { id: 'player_name', title: 'Player' },
        { id: 'overall_rating', title: 'Overall' },
        { id: 'year', title: 'Year' }
      ]
    });

    await csvWriter.writeRecords(records);

    return { filename, filepath };

  } catch (error) {
    console.error('Export CSV error:', error);
    throw error;
  }
}

/**
 * Generate shareable depth chart link
 */
async function generateShareableLink(dynastyId) {
  const crypto = require('crypto');
  const db = require('../config/database');

  try {
    const shareToken = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const result = await db.query(
      `INSERT INTO shared_dynasties (dynasty_id, share_token, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (dynasty_id) 
       DO UPDATE SET share_token = $2, expires_at = $3
       RETURNING *`,
      [dynastyId, shareToken, expiresAt]
    );

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${baseUrl}/shared/${shareToken}`;

  } catch (error) {
    console.error('Generate shareable link error:', error);
    throw error;
  }
}

module.exports = {
  exportDepthChartPDF,
  exportDepthChartCSV,
  generateShareableLink
};
