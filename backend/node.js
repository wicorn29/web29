const express = require('express');
const redis = require('@redis/client');
const cors = require('cors');
const os = require('os');
const app = express();
const port = 3000;

// Enable CORS
app.use(cors());

// Middleware to parse JSON bodies
app.use(express.json());

// Initialize Redis client
const client = redis.createClient({
    url: 'redis://localhost:6379', // Adjust if necessary
});

// Connect to Redis
client.connect()
    .then(() => {
        console.log('Connected to Redis');
    })
    .catch((err) => {
        console.error('Redis connection error:', err);
    });

// Dummy in-memory users data for demo purposes
let users = [
    { username: 'admin', password: 'adminpassword', isAdmin: true, isBanned: false },
    { username: 'user1', password: 'user1password', isAdmin: false, isBanned: false },
];

// Dummy in-memory sites data for demo purposes
let sites = [
    { address: 'demo.com', owner: 'admin', data: 'c2l0ZTIuY29t', siteBanned: false, viewCount: 0, createdAt: new Date(), lastUpdated: new Date() },
    { address: 'site1.com', owner: 'user1', data: 'c2l0ZTIuY29t', siteBanned: false, viewCount: 0, createdAt: new Date(), lastUpdated: new Date() },
];

// Create a new user
app.post('/createUser', async (req, res) => {
    const { username, password, isAdmin, isBanned } = req.body;
    try {
        if (users.find(user => user.username === username)) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        users.push({ username, password, isAdmin, isBanned });
        res.status(201).json({ message: 'User created successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// Basic login authentication
app.post('/loginUser', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = users.find(u => u.username === username);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (user.password !== password) {
            return res.status(401).json({ error: 'Incorrect password' });
        }
        res.status(200).json({ message: 'Login successful', user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to authenticate user' });
    }
});

// Fetch all users
app.get('/getAllUsers', async (req, res) => {
    try {
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to retrieve users' });
    }
});

// Fetch all sites
app.get('/getAllSites', async (req, res) => {
    try {
        res.json(sites);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to retrieve sites' });
    }
});

// Create a new site
app.post('/createSite', async (req, res) => {
    const { address, owner, data, siteBanned } = req.body;
    try {
        if (sites.find(site => site.address === address)) {
            return res.status(400).json({ error: 'Site address already exists' });
        }
        const newSite = {
            address,
            owner,
            data,
            siteBanned: siteBanned || false,
            viewCount: 0,
            createdAt: new Date(),
            lastUpdated: new Date(),
        };
        sites.push(newSite);
        res.status(201).json({ message: 'Site created successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create site' });
    }
});

// Update a site by address
app.put('/updateSite/:address', async (req, res) => {
    const { address } = req.params;
    const { newOwner, newData, siteBanned, password } = req.body;

    try {
        const site = sites.find(s => s.address === address);
        if (!site) {
            return res.status(404).json({ error: 'Site not found' });
        }

        // Check if the password matches the site owner
        if (users.find(u => u.username === site.owner && u.password !== password)) {
            return res.status(403).json({ error: 'Invalid password for the site owner' });
        }

        site.owner = newOwner || site.owner;
        site.data = newData || site.data;
        site.siteBanned = siteBanned !== undefined ? siteBanned : site.siteBanned;
        site.lastUpdated = new Date();

        res.json({ message: `Site ${address} updated successfully`, site });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update site' });
    }
});

// Delete a site by address
app.delete('/deleteSite/:address', async (req, res) => {
    const { address } = req.params;
    try {
        const siteIndex = sites.findIndex(s => s.address === address);
        if (siteIndex === -1) {
            return res.status(404).json({ error: 'Site not found' });
        }

        sites.splice(siteIndex, 1);
        res.json({ message: `Site ${address} deleted successfully` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete site' });
    }
});

// Get a site by address and update the view count
app.get('/getSiteByAddress/:address', async (req, res) => {
    const { address } = req.params;
    try {
        const site = sites.find(s => s.address === address);
        if (!site) {
            return res.status(404).json({ error: 'Site not found' });
        }

        // Update view count
        site.viewCount += 1;
        site.lastUpdated = new Date();

        res.json(site);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to retrieve site' });
    }
});

// Ban a site by address
app.post('/banSite', async (req, res) => {
    const { address } = req.body;
    try {
        const site = sites.find(s => s.address === address);
        if (!site) {
            return res.status(404).json({ error: 'Site not found' });
        }
        site.siteBanned = true;
        res.json({ message: `Site ${address} is now banned` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to ban site' });
    }
});

// Ban a user by username
app.post('/banUser', async (req, res) => {
    const { username } = req.body;
    try {
        const user = users.find(u => u.username === username);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        user.isBanned = true;
        res.json({ message: `User ${username} is now banned` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to ban user' });
    }
});

// Get the server IP dynamically
function getServerIP() {
    const interfaces = os.networkInterfaces();
    for (const interfaceName in interfaces) {
        for (const iface of interfaces[interfaceName]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1'; // Fallback to localhost if no external IP is found
}

// Listen on the specified port
app.listen(port, () => {
    const serverIP = getServerIP();
    console.log(`Server is running on http://${serverIP}:${port}`);
});
