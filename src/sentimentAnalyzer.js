/**
 * Sentiment Analyzer
 * 
 * Analyzes conversation sentiment trajectory.
 * Returns: "improved", "stable", or "declined"
 */

async function analyzeSentimentTrajectory(messages) {
  if (!messages || messages.length < 2) {
    return "unknown";
  }

  // Get first and last caller messages
  const callerMessages = messages.filter((m) => m.role === "user");
  const firstMessage = callerMessages[0];
  const lastMessage = callerMessages[callerMessages.length - 1];

  if (!firstMessage || !lastMessage) {
    return "unknown";
  }

  // Simple heuristic: analyze sentiment markers
  const firstSentiment = analyzeSingleMessage(firstMessage.content);
  const lastSentiment = analyzeSingleMessage(lastMessage.content);

  // Compare
  if (lastSentiment > firstSentiment + 0.2) {
    return "improved";
  }

  if (lastSentiment < firstSentiment - 0.2) {
    return "declined";
  }

  return "stable";
}

function analyzeSingleMessage(text) {
  const hopefulWords = /\b(?:try|willing|maybe|could|hope|help|better|improve|change|ready|want|think about it)\b/i;
  const hopelessWords = /\b(?:no point|nothing works|can't|won't|never|hopeless|give up|pointless|done|finished)\b/i;
  const hopefulMatches = (text.match(hopefulWords) || []).length;
  const hopelessMatches = (text.match(hopelessWords) || []).length;

  return hopefulMatches - hopelessMatches;
}

export { analyzeSentimentTrajectory };
