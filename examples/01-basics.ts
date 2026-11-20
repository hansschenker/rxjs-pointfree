import { from, map, pipe, toArray } from 'rxjs';
import {
  allTrue, anyTrue, compose2, decrementValues, findNegatives, getAccount,
  getAccountBalance, getAges, getBalance, getNames, gt, incrementValues,
  maximum, minimum, people, product, sum, sumFromTen,
} from '../src/index.js';

// The pipeline definitions do not mention the input stream.
const collectNames = pipe(getNames, toArray());
const collectAges = pipe(getAges, toArray());
const collectNegatives = pipe(findNegatives, toArray());
const polynomial = (value: number) => 2 * value * value + 3 * value + 1;
const polynomialAlias = polynomial; // Remove only the pointless forwarding wrapper.
const polynomialValues = pipe(map(polynomialAlias), toArray());

console.log('01 — Functions, currying, and stream operators');
collectNames(from(people)).subscribe(console.log); // Ali, Bob, Car, Dan, Eve
collectAges(from(people)).subscribe(console.log); // 12, 23, 34, 45, 56
collectNegatives(from([-2, 0, 3, -1])).subscribe(console.log); // -2, -1
polynomialValues(from([0, 1, 2])).subscribe(console.log); // 1, 6, 15
incrementValues(from([1, 2, 3])).pipe(toArray()).subscribe(console.log); // 2, 3, 4
decrementValues(from([1, 2, 3])).pipe(toArray()).subscribe(console.log); // 0, 1, 2
sum(from([1, 2, 3])).subscribe(console.log); // 6
sumFromTen(from([1, 2, 3])).subscribe(console.log); // 16
product(from([2, 3, 4])).subscribe(console.log); // 24
anyTrue(from([false, true])).subscribe(console.log); // true
allTrue(from([true, true])).subscribe(console.log); // true
minimum(from([5, 2, 9])).subscribe(console.log); // 2
maximum(from([-5, -2, -9])).subscribe(console.log); // -2

// compose2 takes outer, inner; imported pipe reads in execution order.
const nestedBalance = compose2(getBalance, getAccount);
const specimen = { name: 'Example', age: 18, account: { balance: -7 } };
console.log(nestedBalance(specimen), getAccountBalance(specimen)); // -7, -7
console.log('gt(0)(5):', gt(0)(5)); // true: value comes last
