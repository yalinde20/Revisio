import { SecurityContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { rendreMarkdown, rendreMarkdownEnLigne } from './markdown';

describe('rendu Markdown', () => {
  const nettoyer = (html: string) => TestBed.inject(DomSanitizer).sanitize(SecurityContext.HTML, html) ?? '';

  it('rend le code, le gras et les listes', () => {
    const html = rendreMarkdown('**gras** et `code`\n\n- un\n- deux');
    expect(html).toContain('<strong>gras</strong>');
    expect(html).toContain('<code>code</code>');
    expect(html).toContain('<li>un</li>');
  });

  it('rend le Markdown en ligne sans balise de paragraphe', () => {
    expect(rendreMarkdownEnLigne('appelle `inflate`')).toBe('appelle <code>inflate</code>');
  });

  it("neutralise le HTML dangereux d'un paquet une fois passé par le nettoyage d'Angular", () => {
    const piege = '<img src=x onerror="alert(1)"> <script>alert(2)</script> [clic](javascript:alert(3)) <a href="javascript:alert(4)">x</a>';
    const propre = nettoyer(rendreMarkdown(piege));
    expect(propre).not.toContain('onerror');
    expect(propre).not.toContain('<script');
    // Angular préfixe les URLs dangereuses par « unsafe: » : le lien ne s'exécute plus
    expect(propre.toLowerCase()).not.toMatch(/href="javascript:/);
    expect(propre).toContain('unsafe:javascript:');
  });
});
