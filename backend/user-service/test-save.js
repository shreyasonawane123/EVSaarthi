const { db } = require('./config/firebase');

async function testSave() {
  try {
    const userRef = db.collection('users').doc('TESTING_123');
    
    // Simulate what the route does
    const uid = 'TESTING_123';
    const email = 'test@example.com';
    const name = 'SHREYA SONAWANE';
    const city = 'Pune';
    const vehicleId = undefined;
    const electricityTariff = 7;
    const photoURL = undefined;

    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      await userRef.set({
        uid: uid,
        email: email || "",
        name: name || "",
        photoURL: photoURL || "",
        city: city || "",
        vehicleId: vehicleId || null,
        electricityTariff: electricityTariff || 7,
        totalPoints: 0,
        co2Saved: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      console.log('Created OK');
    } else {
      const updates = { updatedAt: new Date().toISOString() };
      if (name !== undefined) updates.name = name;
      if (city !== undefined) updates.city = city;
      if (vehicleId !== undefined) updates.vehicleId = vehicleId;
      if (electricityTariff !== undefined) updates.electricityTariff = electricityTariff;
      if (photoURL !== undefined) updates.photoURL = photoURL;
      await userRef.update(updates);
      console.log('Updated OK');
    }
  } catch(error) {
    console.error('ERROR TRACE:', error);
  }
}

testSave();
