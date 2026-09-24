const { dbRun, initDB } = require('./db');

const seed = async () => {
  await initDB();

  console.log('Seeding initial test records for DHT11...');
  const baseTime = Date.now();
  
  // Insert 25 readings separated by 10 seconds to test pagination (20 per page)
  for (let i = 25; i >= 1; i--) {
    const timestamp = new Date(baseTime - (i * 10000)).toISOString();
    const temp = (25.5 + Math.sin(i / 2) * 3).toFixed(1);
    const hum = (58.0 + Math.cos(i / 2) * 8).toFixed(1);

    await dbRun(
      'INSERT INTO dht_records (temperature, humidity, created_at) VALUES (?, ?, ?)',
      [parseFloat(temp), parseFloat(hum), timestamp]
    );
  }

  console.log('✅ Seeding completed! 25 sensor records added.');
  process.exit(0);
};

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
