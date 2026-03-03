import {
  IconPromptArgs,
  PatternPromptArgs,
  DiagramPromptArgs,
} from '../types/index.js';

export function buildIconPrompt(args?: IconPromptArgs): string {
  const basePrompt = args?.prompt || 'app icon';
  const type = args?.type || 'app-icon';
  const style = args?.style || 'modern';
  const background = args?.background || 'transparent';
  const corners = args?.corners || 'rounded';

  let prompt = `${basePrompt}, ${style} style ${type}`;

  if (type === 'app-icon') {
    prompt += `, ${corners} corners`;
  }

  if (background !== 'transparent') {
    prompt += `, ${background} background`;
  }

  prompt += ', clean design, high quality, professional';
  return prompt;
}

export function buildPatternPrompt(args?: PatternPromptArgs): string {
  const basePrompt = args?.prompt || 'abstract pattern';
  const type = args?.type || 'seamless';
  const style = args?.style || 'abstract';
  const density = args?.density || 'medium';
  const colors = args?.colors || 'colorful';
  const size = args?.size || '256x256';

  let prompt = `${basePrompt}, ${style} style ${type} pattern, ${density} density, ${colors} colors`;

  if (type === 'seamless') {
    prompt += ', tileable, repeating pattern';
  }

  prompt += `, ${size} tile size, high quality`;
  return prompt;
}

export function buildDiagramPrompt(args?: DiagramPromptArgs): string {
  const basePrompt = args?.prompt || 'system diagram';
  const type = args?.type || 'flowchart';
  const style = args?.style || 'professional';
  const layout = args?.layout || 'hierarchical';
  const complexity = args?.complexity || 'detailed';
  const colors = args?.colors || 'accent';
  const annotations = args?.annotations || 'detailed';

  let prompt = `${basePrompt}, ${type} diagram, ${style} style, ${layout} layout`;
  prompt += `, ${complexity} level of detail, ${colors} color scheme`;
  prompt += `, ${annotations} annotations and labels`;
  prompt += ', clean technical illustration, clear visual hierarchy';
  return prompt;
}
