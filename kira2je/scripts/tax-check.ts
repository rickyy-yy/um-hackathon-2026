import { calculateTax } from '../lib/tax';

console.log('Case 1: RM7368/month profit, individual relief only');
console.log(calculateTax(7368 * 12, []));

console.log('\nCase 2: RM7368/month + full reliefs');
console.log(calculateTax(7368 * 12, ['epf', 'socso', 'lifestyle', 'medical_insurance']));

console.log('\nCase 3: Aminah seed RM35,950.98/month');
console.log(calculateTax(35950.98 * 12, []));

console.log('\nCase 4: exactly RM9000 profit (= individual relief)');
console.log(calculateTax(9000, []));

console.log('\nCase 5: RM5000 profit — below relief');
console.log(calculateTax(5000, []));
