const request = require('supertest');
const App = require('./app');

describe('API Health Check', () => {
  let app;

  beforeAll(async () => {
    const appInstance = new App();
    // We don't necessarily need to call initialize() if it connects to a real DB,
    // as it might slow down or fail tests. 
    // For a simple health check test, getApp() might be enough if the route is defined in constructor.
    app = appInstance.getApp();
  });

  it('should return 200 for /api/health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'healthy');
  });

  it('should return 404 for non-existent routes', async () => {
    const res = await request(app).get('/api/v1/non-existent');
    expect(res.statusCode).toEqual(404);
  });
});
