const express = require('express');
const Database = require('../database');

const router = express.Router();
const db = new Database();

// Get all services
router.get('/', async (req, res) => {
  try {
    const services = await db.getServices();
    res.json(services);
  } catch (error) {
    console.error('Error getting services:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all countries
router.get('/countries', async (req, res) => {
  try {
    const phoneNumbers = await db.getPhoneNumbers();
    
    // Group unique countries
    const countriesMap = new Map();
    phoneNumbers.forEach(p => {
      if (!countriesMap.has(p.country_code)) {
        countriesMap.set(p.country_code, {
          code: p.country_code.toLowerCase(),
          name: p.country_name,
          availableNumbers: 0
        });
      }
      countriesMap.get(p.country_code).availableNumbers++;
    });

    const countries = Array.from(countriesMap.values()).sort((a, b) => 
      a.name.localeCompare(b.name)
    );

    res.json(countries);
  } catch (error) {
    console.error('Error getting countries:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get pricelist by services
router.get('/pricelist', async (req, res) => {
  try {
    const services = await db.getServices();
    const phoneNumbers = await db.getPhoneNumbers();
    
    // Group countries
    const countries = [...new Set(phoneNumbers.map(p => ({
      code: p.country_code,
      name: p.country_name
    })))];

    const pricelist = services.map(service => ({
      serviceId: service.id,
      serviceName: service.name,
      countries: countries.map(country => ({
        countryId: country.code.toLowerCase(),
        countryName: country.name,
        price: service.price,
        available: true
      }))
    }));

    res.json(pricelist);
  } catch (error) {
    console.error('Error getting pricelist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get pricelist by countries
router.get('/pricelist/countries', async (req, res) => {
  try {
    const services = await db.getServices();
    const phoneNumbers = await db.getPhoneNumbers();
    
    // Group by countries
    const countries = [...new Set(phoneNumbers.map(p => p.country_code))];
    
    const pricelist = countries.map(countryCode => {
      const country = phoneNumbers.find(p => p.country_code === countryCode);
      return {
        countryId: countryCode.toLowerCase(),
        countryName: country.country_name,
        services: services.map(service => ({
          serviceId: service.id,
          serviceName: service.name,
          price: service.price,
          available: true
        }))
      };
    });

    res.json(pricelist);
  } catch (error) {
    console.error('Error getting country pricelist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single service price and availability
router.get('/:serviceId/countries/:countryId', async (req, res) => {
  try {
    const { serviceId, countryId } = req.params;
    
    const services = await db.getServices();
    const service = services.find(s => s.id === serviceId);
    
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const phoneNumbers = await db.getPhoneNumbers(countryId.toUpperCase());
    
    res.json({
      serviceId: service.id,
      serviceName: service.name,
      countryId: countryId.toLowerCase(),
      price: service.price,
      available: phoneNumbers.length > 0,
      availableNumbers: phoneNumbers.length
    });
  } catch (error) {
    console.error('Error getting service availability:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
