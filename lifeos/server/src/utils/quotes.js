'use strict';

// Curated, real quotations. Extend the list freely; "daily" is deterministic per day of year.
const QUOTES = [
  { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
  { text: 'It always seems impossible until it is done.', author: 'Nelson Mandela' },
  { text: 'The way to get started is to quit talking and begin doing.', author: 'Walt Disney' },
  { text: 'Well done is better than well said.', author: 'Benjamin Franklin' },
  { text: 'Plans are nothing; planning is everything.', author: 'Dwight D. Eisenhower' },
  { text: 'What gets measured gets managed.', author: 'Peter Drucker' },
  { text: 'Do the hard jobs first. The easy jobs will take care of themselves.', author: 'Dale Carnegie' },
  { text: 'You do not rise to the level of your goals. You fall to the level of your systems.', author: 'James Clear' },
];

function dailyQuote(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86400000);
  return { ...QUOTES[dayOfYear % QUOTES.length], dayOfYear };
}

module.exports = { dailyQuote, QUOTES };
