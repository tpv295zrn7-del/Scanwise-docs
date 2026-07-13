jest.mock('../../services/axios-config', () => ({
  get: jest.fn(),
  post: jest.fn(),
  delete: jest.fn(),
  patch: jest.fn(),
  interceptors: { request: { use: jest.fn() } }
}));

const productsService = require('../../services/api/products.service');
const apiClient = require('../../services/axios-config');

test('alternatives passes goals query parameter', async () => {
  apiClient.get.mockResolvedValue({ data: [] });
  await productsService.alternatives('123', ['lower_sugar', 'higher_protein']);
  expect(apiClient.get).toHaveBeenCalledWith('/api/alternatives/123', { params: { goals: 'lower_sugar,higher_protein' } });
});
