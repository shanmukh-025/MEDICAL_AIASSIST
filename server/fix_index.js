const mongoose = require('mongoose');
require('dotenv').config();

const dropIndex = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected!');

        const collection = mongoose.connection.db.collection('prescriptions');
        const indexes = await collection.indexes();
        console.log('Current indexes:', indexes.map(i => i.name));

        const indexName = 'prescriptionNumber_1';
        const indexExists = indexes.some(index => index.name === indexName);

        if (indexExists) {
            console.log(`Found index ${indexName}. Dropping...`);
            await collection.dropIndex(indexName);
            console.log('✅ SUCCESS: Index dropped!');
        } else {
            console.log(`Index ${indexName} not found. Nothing to do.`);
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
};

dropIndex();
