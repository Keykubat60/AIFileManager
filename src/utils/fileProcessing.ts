export interface ProcessedFile {
  id: string;
  name: string;
  suggestedFolder: string;
  dateAdded: string;
  content?: string;
  path: string; // Neues Feld hinzugefügt

}

export const suggestFolder = (content: string): string => {
  const lowerContent = content.toLowerCase();
  if (lowerContent.includes('rechnung')) {
    return 'Rechnungen';
  } else if (lowerContent.includes('vertrag')) {
    return 'Verträge';
  } else if (lowerContent.includes('bericht')) {
    return 'Berichte';
  }
  return 'Sonstiges';
};