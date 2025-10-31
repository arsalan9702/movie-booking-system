import axios from 'axios';

const API_URL = 'http://localhost:3000/api';
const TOTAL_REQUESTS = 100000;
const CONCURRENT_REQUESTS = 100;

async function makeBooking() {
  return axios.post(`${API_URL}/bookings`, {
    movieId: Math.floor(Math.random() * 10) + 1,
    seats: ['A1', 'A2'],
    screeningId: Math.floor(Math.random() * 5) + 1
  });
}

async function runTest() {
  let completed = 0;
  
  while (completed < TOTAL_REQUESTS) {
    const batch = Array(CONCURRENT_REQUESTS).fill(null).map(() => makeBooking());
    await Promise.allSettled(batch);
    completed += CONCURRENT_REQUESTS;
    console.log(`Completed ${completed}/${TOTAL_REQUESTS} requests`);
    await new Promise(r => setTimeout(r, 100)); // small delay between batches
  }
}

runTest().catch(console.error);
