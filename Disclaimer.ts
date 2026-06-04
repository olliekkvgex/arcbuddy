// Disclaimer utility to generate formatted disclaimer text with dynamic ARC source

export const getDisclaimerHTML = (arcSource: string): string => {
  const source = arcSource || 'the publisher';
  return `<p><em>This book was provided free of charge by ${source} in exchange for an honest review.</em></p>`;
};
