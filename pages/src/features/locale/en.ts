const lang = {
  name: "English",
  shortName: "en",
  languageName: "English",
  lp: {
    hero: {
      mainCopy:
        "Write faster. Think stronger.\nYour stored words become your power.",
      subCopy:
        "Prompts are saved automatically. Reuse them instantly from menus or autocomplete — no setup needed, across all major AIs.",
      description:
        "Used ChatGPT or Gemini and thought, “I wish I could reuse that prompt”?\nMeet Prompt history — it automatically saves every prompt you send and lets you reuse it in a flash. Install it once, and your AI work instantly speeds up.",
    },
    issues: {
      heading: 'Those "little frustrations" you feel as you use AI more',
      cards: [
        {
          emoji: "😩",
          title: "Retyping the same prompts every time",
          description:
            "Manually typing slightly different prompts each time. Inefficient time keeps piling up.",
        },
        {
          emoji: "📂",
          title: "Hard to find standard prompts",
          description:
            "That perfect prompt you crafted once—are you spending time searching for it when you want to use it again?",
        },
        {
          emoji: "⏰",
          title: "Don't want to spend time on setup",
          description:
            "The real goal is efficiency. Spending time on tool setup defeats the purpose.",
        },
        {
          emoji: "💭",
          title: "Want to try with different models",
          description:
            "You want to test prompts with other models, but copy-pasting is tedious. If you could try them quickly, wouldn't improvement accelerate?",
        },
        {
          emoji: "🌐",
          title: "Difficult to reuse across services",
          description:
            "Using multiple AI services like ChatGPT and Gemini scatters your prompts, making them hard to find again...",
        },
        {
          emoji: "💡",
          title: "Forgetting to save great prompts",
          description:
            "Have you ever lost that one-time perfect prompt somewhere?",
        },
      ],
    },
    solutions: {
      heading: '"Prompt history" solves those frustrations',
      cards: [
        {
          emoji: "📝",
          title: "Auto-save: Turn prompts into assets with zero effort",
          description:
            "Automatically save history when you send prompts in AI chat services. No more worries about forgetting to save! Completely free yourself from manual copy-paste work that hinders efficiency.",
        },
        {
          emoji: "⚡",
          title:
            "Lightning-fast reuse: Instant completion without breaking flow",
          description:
            "Saved prompts can be displayed from the menu bar and appear as auto-completion in the AI chat input field. Zero time spent searching for prompts. Resume work immediately without breaking your flow of thought.",
        },
        {
          emoji: "🌐",
          title: "Cross-AI service: Reuse across different models",
          description:
            "Supports ChatGPT, Gemini, Claude, and Perplexity. Reuse the same prompts across services. Even if you use multiple AI services, no more searching around for prompts.",
        },
      ],
      closing:
        "For those who want to focus on what truly matters, without spending time on entering and organizing prompts.\nWe support maximizing the time for creative work and learning that you truly want to engage in.",
    },
    cta: {
      heading: "Free yourself from prompt management stress right now",
      subheading: "Installation takes just 10 seconds, effects start today",
      buttonText: "\nFree Install",
    },
    faq: {
      heading: "Frequently Asked Questions",
      items: [
        {
          question: "Q: Is it free? Do I need an API key?",
          answer:
            "A: It's free to use. No API key is required. We don't use any APIs since we input directly into the AI service's chat field.",
        },
        {
          question: "Q: Is my data secure?",
          answer:
            "A: Yes. Prompt history does not send or store your prompt data on external servers. All data is securely managed within your browser.",
        },
        {
          question: "Q: Can I use it immediately without setup?",
          answer:
            "A: Yes. Just install it, and auto-save and reuse features will be active from the moment you send your next prompt.",
        },
        {
          question: "Q: Will support for more AI services be added?",
          answer:
            "A: Yes. We plan to expand support for major AI chat services. If you have requests, please let us know in the Chrome Web Store reviews.",
        },
      ],
    },
  },
} as const
export default lang
