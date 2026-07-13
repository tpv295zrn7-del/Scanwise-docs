const formatTier = (tier) => (tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : 'Free');
const formatCurrency = (amount) => `$${Number(amount).toFixed(2)}`;

module.exports = { formatTier, formatCurrency };
