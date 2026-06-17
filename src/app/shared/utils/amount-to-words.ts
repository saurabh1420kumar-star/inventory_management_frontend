const ones = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function convertBelow1000(n: number): string {
  if (n === 0) return '';
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
  return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertBelow1000(n % 100) : '');
}

export function amountToWords(amount: number): string {
  if (!amount && amount !== 0) return '';
  const n = Math.floor(Math.abs(amount));
  const paise = Math.round((Math.abs(amount) - n) * 100);

  if (n === 0 && paise === 0) return 'Zero Rupees Only';

  let result = '';
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const remainder = n % 1000;

  if (crore > 0) result += convertBelow1000(crore) + ' Crore ';
  if (lakh > 0) result += convertBelow1000(lakh) + ' Lakh ';
  if (thousand > 0) result += convertBelow1000(thousand) + ' Thousand ';
  if (remainder > 0) result += convertBelow1000(remainder);

  result = result.trim() + ' Rupees';
  if (paise > 0) result += ' and ' + convertBelow1000(paise) + ' Paise';
  result += ' Only';

  return result;
}
