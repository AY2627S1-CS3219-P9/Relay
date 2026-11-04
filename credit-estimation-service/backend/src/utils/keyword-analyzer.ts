import { ServiceTypeBaseline } from '../config/baselines'

/// Keyword weights for title
const TITLE_KEYWORDS = {
  heavy: 5,
  large: 4,
  multiple: 5,
  fragile: 4,
  urgent: 4,
  'deliver to floor': 4,
} as const

/// Keyword weights for description
const DESCRIPTION_KEYWORDS = {
  'specific requirements': 5,
  'special instructions': 4,
  'multiple items': 5,
  fragile: 4,
  'time-sensitive': 4,
  asap: 4,
} as const

function extractKeywords(text: string): Set<string> {
  const lowerText = text.toLowerCase()
  const words = new Set<string>()

  // Add individual words
  const wordList = lowerText.split(/\s+/)
  for (const word of wordList) {
    words.add(word.replace(/[^\w]/g, ''))
  }

  // Add multi-word phrases
  if (lowerText.includes('specific requirements')) {
    words.add('specific requirements')
  }
  if (lowerText.includes('special instructions')) {
    words.add('special instructions')
  }
  if (lowerText.includes('multiple items')) {
    words.add('multiple items')
  }
  if (lowerText.includes('deliver to floor')) {
    words.add('deliver to floor')
  }
  if (lowerText.includes('time-sensitive')) {
    words.add('time-sensitive')
  }

  return words
}

export function analyzeTitle(title: string): {
  score: number
  keywordsFound: string[]
} {
  const titleKeywords = extractKeywords(title)
  const foundKeywords: string[] = []
  let score = 0

  // Check for high-priority keywords
  if (titleKeywords.has('heavy')) {
    score += TITLE_KEYWORDS.heavy
    foundKeywords.push('heavy')
  }
  if (titleKeywords.has('large')) {
    score += TITLE_KEYWORDS.large
    foundKeywords.push('large')
  }
  if (titleKeywords.has('multiple')) {
    score += TITLE_KEYWORDS.multiple
    foundKeywords.push('multiple')
  }
  if (titleKeywords.has('fragile')) {
    score += TITLE_KEYWORDS.fragile
    foundKeywords.push('fragile')
  }
  if (titleKeywords.has('urgent')) {
    score += TITLE_KEYWORDS.urgent
    foundKeywords.push('urgent')
  }
  if (titleKeywords.has('deliver to floor')) {
    score += TITLE_KEYWORDS['deliver to floor']
    foundKeywords.push('deliver to floor')
  }

  // Normalize to 0-10 range
  const normalizedScore = Math.min(Math.round(score / 10), 10)

  return { score: normalizedScore, keywordsFound: foundKeywords }
}

/**
 * Analyze description for complexity indicators
 * Returns: complexity score adjustment (0-15)
 */
export function analyzeDescription(description: string): {
  score: number
  keywordsFound: string[]
  wordCount: number
} {
  const descKeywords = extractKeywords(description)
  const foundKeywords: string[] = []
  let score = 0
  const wordCount = description.split(/\s+/).length

  if (descKeywords.has('specific requirements')) {
    score += DESCRIPTION_KEYWORDS['specific requirements']
    foundKeywords.push('specific requirements')
  }
  if (descKeywords.has('special instructions')) {
    score += DESCRIPTION_KEYWORDS['special instructions']
    foundKeywords.push('special instructions')
  }
  if (descKeywords.has('multiple items')) {
    score += DESCRIPTION_KEYWORDS['multiple items']
    foundKeywords.push('multiple items')
  }
  if (descKeywords.has('fragile')) {
    score += DESCRIPTION_KEYWORDS.fragile
    foundKeywords.push('fragile')
  }
  if (descKeywords.has('time-sensitive')) {
    score += DESCRIPTION_KEYWORDS['time-sensitive']
    foundKeywords.push('time-sensitive')
  }
  if (descKeywords.has('asap')) {
    score += DESCRIPTION_KEYWORDS.asap
    foundKeywords.push('asap')
  }

  // Normalize to 0-15 range
  const normalizedScore = Math.min(Math.round(score / 10), 15)

  return { score: normalizedScore, keywordsFound: foundKeywords, wordCount }
}

export function calculateComplexityScore(titleScore: number, descScore: number): number {
  const titleWeight = 0.4
  const descWeight = 0.6

  const weightedScore = Math.round(titleScore * titleWeight) + Math.round(descScore * descWeight)

  // Normalize to 0-10 range
  return Math.min(Math.round((weightedScore / 15) * 10), 10)
}

export function analyzeKeywords(
  title: string,
  description: string,
): {
  titleScore: number
  titleKeywords: string[]
  descScore: number
  descKeywords: string[]
  wordCount: number
  complexityScore: number
} {
  const titleResult = analyzeTitle(title)
  const descResult = analyzeDescription(description)

  const complexityScore = calculateComplexityScore(titleResult.score, descResult.score)

  return {
    titleScore: titleResult.score,
    titleKeywords: titleResult.keywordsFound,
    descScore: descResult.score,
    descKeywords: descResult.keywordsFound,
    wordCount: descResult.wordCount,
    complexityScore,
  }
}

export function generateExplanation(
  baseline: ServiceTypeBaseline,
  analysis: {
    titleScore: number
    titleKeywords: string[]
    descScore: number
    descKeywords: string[]
    wordCount: number
    complexityScore: number
  },
): string {
  const { titleKeywords, descKeywords, complexityScore } = analysis

  const parts: string[] = []

  // Base description
  parts.push(`Standard ${baseline.name.toLowerCase()} errand`)

  // Add complexity indicators
  const allKeywords = [...titleKeywords, ...descKeywords]
  if (allKeywords.length > 0) {
    parts.push(`with complexity indicators: ${allKeywords.join(', ')}`)
  }

  // Add complexity level
  if (complexityScore >= 7) {
    parts.push('high complexity')
  } else if (complexityScore >= 4) {
    parts.push('moderate complexity')
  } else {
    parts.push('low complexity')
  }

  return parts.join('. ') + '.'
}
