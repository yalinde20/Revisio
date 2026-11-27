import { distanceLevenshtein, normaliser, verifierReponse } from './verification';

describe('normaliser', () => {
  it('ignore la casse, les accents et les espaces en trop', () => {
    expect(normaliser('  Écouteur  ')).toBe('ecouteur');
  });
  it('retire les parenthèses vides et la ponctuation finale', () => {
    expect(normaliser('newInstance().')).toBe('newinstance');
  });
  it("retire l'article initial", () => {
    expect(normaliser("L'adaptateur")).toBe('adaptateur');
    expect(normaliser('Un callback')).toBe('callback');
  });
});

describe('distanceLevenshtein', () => {
  it('compte les modifications', () => {
    expect(distanceLevenshtein('chat', 'chat')).toBe(0);
    expect(distanceLevenshtein('chat', 'chats')).toBe(1);
    expect(distanceLevenshtein('kitten', 'sitting')).toBe(3);
  });
});

describe('verifierReponse', () => {
  const acceptees = ['getItemCount', 'getItemCount()'];

  it('accepte la réponse exacte, quelle que soit la casse', () => {
    expect(verifierReponse('getitemcount', acceptees)).toBe('exacte');
    expect(verifierReponse('getItemCount()', acceptees)).toBe('exacte');
  });
  it('accepte une faute de frappe sur un mot long, en la signalant', () => {
    expect(verifierReponse('getItemCont', acceptees)).toBe('proche');
  });
  it('refuse une réponse fausse ou vide', () => {
    expect(verifierReponse('createFragment', acceptees)).toBe('fausse');
    expect(verifierReponse('   ', acceptees)).toBe('fausse');
  });
  it("ne tolère aucune faute sur un mot court (« \$gt » n'est pas « \$lt »)", () => {
    expect(verifierReponse('$lt', ['$gt'])).toBe('fausse');
  });
});
