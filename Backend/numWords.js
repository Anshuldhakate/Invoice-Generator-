const smallNumbers = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function convertToWords(num) {
    if (num < 20) return smallNumbers[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? '-' + smallNumbers[num % 10] : '');
    if (num < 1000) return smallNumbers[Math.floor(num / 100)] + ' hundred' + (num % 100 ? ' and ' + convertToWords(num % 100) : '');
    if (num < 1000000) return convertToWords(Math.floor(num / 1000)) + ' thousand' + (num % 1000 ? ' ' + convertToWords(num % 1000) : '');
    if (num < 1000000000) return convertToWords(Math.floor(num / 1000000)) + ' million' + (num % 1000000 ? ' ' + convertToWords(num % 1000000) : '');
    return convertToWords(Math.floor(num / 1000000000)) + ' billion' + (num % 1000000000 ? ' ' + convertToWords(num % 1000000000) : '');
}

module.exports = convertToWords;
