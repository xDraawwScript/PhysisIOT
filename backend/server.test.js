const request = require('supertest');

// --- MOCKS simulation ---
// simuler la base de données MySQL
const mockQuery = jest.fn();
const mockConnection = {
    query: mockQuery,
    end: jest.fn()
};
const mockPool = {
    query: mockQuery,
    getConnection: jest.fn().mockReturnValue({
        query: mockQuery,
        release: jest.fn()
    })
};

jest.mock('mysql2/promise', () => ({
    createPool: () => mockPool,
    createConnection: jest.fn().mockResolvedValue(mockConnection)
}));

// simuler systeme de fichiers
jest.mock('fs-extra', () => ({
    ensureFile: jest.fn(),
    readJson: jest.fn().mockResolvedValue({ zones: {} }),
    writeJson: jest.fn(),
}));

// On simule fetch (Meteoblue) et nodemailer
jest.mock('node-fetch', () => jest.fn());
jest.mock('nodemailer', () => ({
    createTransport: () => ({
        sendMail: jest.fn().mockResolvedValue(true)
    })
}));

// import de l'application Express
const app = require('./server');

// --- TESTS ---
describe('tests API backend SAE', () => {

    beforeEach(() => {
        mockQuery.mockClear();
    });

    // TEST 1 : Vérifier que la liste des zones fonctionne
    test('GET /api/zones - doit retourner la liste des zones', async () => {
        const res = await request(app).get('/api/zones');
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual(["Valbonne", "Biot", "Sophia Antipolis"]);
    });

    // TEST 2 : Tester le LOGIN 
    test('POST /api/login - Connexion réussie', async () => {
        // fausse response BDD
        const fakeUser = { 
            id: 1, 
            username: 'testuser', 
            password: 'bonpassword', 
            email: 'test@test.com' 
        };
        mockQuery.mockResolvedValueOnce([ [fakeUser] ]);
        const res = await request(app)
            .post('/api/login')
            .send({
                username: 'testuser',
                password: 'bonpassword'
            });
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.user.username).toBe('testuser');
    });

    // TEST 3 : Tester le login - mot de passe incorrect
    test('POST /api/login - Mot de passe incorrect', async () => {
        const fakeUser = { id: 1, username: 'testuser', password: 'bonpassword' };
        mockQuery.mockResolvedValueOnce([ [fakeUser] ]);
        const res = await request(app)
            .post('/api/login')
            .send({
                username: 'testuser',
                password: 'mauvaispassword'
            });
        expect(res.statusCode).toBe(401);
        expect(res.body.error).toBe("Mot de passe incorrect");
    });

    // TEST 4 : Historique Capteur 
    test('GET /api/sensor-history/:zoneId - Récupération données', async () => {
        const fakeSensorData = [
            { 
                date: '17/12', 
                temperature: 25.5, 
                humidite: 40, 
                gaz: 100, 
                received_at: new Date() 
            },
            { 
                date: '17/12', 
                temperature: 26.5, 
                humidite: 38, 
                gaz: 110, 
                received_at: new Date() 
            }
        ];

        mockQuery.mockResolvedValueOnce([ fakeSensorData ]);
        const res = await request(app).get('/api/sensor-history/Valbonne');
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        if(res.body.length > 0) {
            expect(res.body[0]).toHaveProperty('temperature');
        }
    });

    // TEST 5 : Inscription 
    test('POST /api/signup - Création utilisateur', async () => {
        // 1er appel BDD : Vérifier si l'user existe (on retourne tableau vide = n'existe pas)
        mockQuery.mockResolvedValueOnce([ [] ]);
        mockQuery.mockResolvedValueOnce([ { insertId: 1 } ]);
        const res = await request(app)
            .post('/api/signup')
            .send({
                username: 'nouveau',
                email: 'nouveau@test.com',
                password: 'pass',
                purposes: ['housing'],
                langue: 'fr',
                notifications: [],
                zones: []
            });
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });

});