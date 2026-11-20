export type Account = Readonly<{ balance: number }>;

export type Person = Readonly<{
  name: string;
  age: number;
  account: Account;
}>;

/** The five people from the supplied Pointless or Pointfree notes. */
export const people: readonly Person[] = [
  { name: 'Ali', age: 12, account: { balance: -1 } },
  { name: 'Bob', age: 23, account: { balance: -2 } },
  { name: 'Car', age: 34, account: { balance: 30 } },
  { name: 'Dan', age: 45, account: { balance: -4 } },
  { name: 'Eve', age: 56, account: { balance: 50 } },
];

/** A complete new snapshot: Bob has repaid his debt; Dan still owes four. */
export const repaidPeople: readonly Person[] = people.map((person) =>
  person.name === 'Bob' ? { ...person, account: { balance: 0 } } : person,
);
