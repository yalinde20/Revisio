import { marked } from 'marked';

/**
 * Markdown vers HTML. Le résultat est destiné à `[innerHTML]` : Angular le nettoie
 * (scripts, gestionnaires d'événements, URLs dangereuses) avant l'insertion, ce qui compte
 * parce que le contenu des paquets vient de fichiers qu'on ne maîtrise pas à 100 %.
 */
export function rendreMarkdown(source: string): string {
  return marked.parse(source, { gfm: true, breaks: false, async: false });
}

/** Markdown en ligne (code, gras, italique) sans bloc : pour les énoncés et les options. */
export function rendreMarkdownEnLigne(source: string): string {
  return marked.parseInline(source, { gfm: true, async: false });
}
