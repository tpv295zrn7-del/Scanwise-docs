module.exports = (score) => ({ score, label: score >= 75 ? 'good' : score >= 40 ? 'okay' : 'poor' });
