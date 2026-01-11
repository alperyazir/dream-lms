"""
AI Cost Calculation Module.

Calculates estimated costs for LLM and TTS API usage based on
provider-specific pricing.
"""

# LLM Cost per 1K tokens (USD)
LLM_COSTS = {
    "deepseek": {
        "input": 0.00014,   # $0.14 per 1M input tokens
        "output": 0.00028,  # $0.28 per 1M output tokens
    },
    "gemini": {
        "input": 0.0,       # Free tier (Gemini 1.5 Flash)
        "output": 0.0,
    },
    "openai_gpt4": {
        "input": 0.01,      # $10 per 1M tokens
        "output": 0.03,     # $30 per 1M tokens
    },
    "openai_gpt35": {
        "input": 0.0005,    # $0.50 per 1M tokens
        "output": 0.0015,   # $1.50 per 1M tokens
    },
}

# TTS Cost per character (USD)
TTS_COSTS = {
    "edge_tts": 0.0,          # Free (Microsoft Edge TTS)
    "azure_tts": 0.000004,    # $4 per 1M characters (Azure Neural TTS)
    "google_tts": 0.000004,   # $4 per 1M characters
}


def calculate_llm_cost(
    provider: str,
    input_tokens: int,
    output_tokens: int,
) -> float:
    """
    Calculate estimated cost for LLM generation.

    Args:
        provider: LLM provider name (e.g., "deepseek", "gemini")
        input_tokens: Number of input tokens
        output_tokens: Number of output tokens

    Returns:
        Estimated cost in USD

    Example:
        >>> calculate_llm_cost("deepseek", 1000, 500)
        0.00028  # (1000/1000 * 0.00014) + (500/1000 * 0.00028)
    """
    costs = LLM_COSTS.get(provider, {"input": 0, "output": 0})

    input_cost = (input_tokens / 1000) * costs["input"]
    output_cost = (output_tokens / 1000) * costs["output"]

    return round(input_cost + output_cost, 8)


def calculate_tts_cost(
    provider: str,
    characters: int,
) -> float:
    """
    Calculate estimated cost for TTS generation.

    Args:
        provider: TTS provider name (e.g., "edge_tts", "azure_tts")
        characters: Number of characters converted to speech

    Returns:
        Estimated cost in USD

    Example:
        >>> calculate_tts_cost("azure_tts", 1000)
        0.000004  # 1000 * 0.000004
    """
    cost_per_char = TTS_COSTS.get(provider, 0.0)
    return round(characters * cost_per_char, 8)


def get_llm_provider_costs(provider: str) -> dict[str, float]:
    """
    Get cost rates for a specific LLM provider.

    Args:
        provider: LLM provider name

    Returns:
        Dictionary with 'input' and 'output' cost per 1K tokens
    """
    return LLM_COSTS.get(provider, {"input": 0.0, "output": 0.0})


def get_tts_provider_cost(provider: str) -> float:
    """
    Get cost rate for a specific TTS provider.

    Args:
        provider: TTS provider name

    Returns:
        Cost per character in USD
    """
    return TTS_COSTS.get(provider, 0.0)


def estimate_monthly_cost(
    llm_requests_per_day: int,
    avg_input_tokens: int,
    avg_output_tokens: int,
    llm_provider: str,
    tts_requests_per_day: int = 0,
    avg_tts_characters: int = 0,
    tts_provider: str = "edge_tts",
) -> dict[str, float]:
    """
    Estimate monthly costs based on average daily usage.

    Args:
        llm_requests_per_day: Number of LLM requests per day
        avg_input_tokens: Average input tokens per request
        avg_output_tokens: Average output tokens per request
        llm_provider: LLM provider name
        tts_requests_per_day: Number of TTS requests per day
        avg_tts_characters: Average characters per TTS request
        tts_provider: TTS provider name

    Returns:
        Dictionary with cost breakdown:
        {
            "llm_cost_per_day": float,
            "tts_cost_per_day": float,
            "total_cost_per_day": float,
            "llm_cost_per_month": float,
            "tts_cost_per_month": float,
            "total_cost_per_month": float,
        }
    """
    llm_cost_per_request = calculate_llm_cost(
        llm_provider, avg_input_tokens, avg_output_tokens
    )
    llm_cost_per_day = llm_cost_per_request * llm_requests_per_day

    tts_cost_per_request = calculate_tts_cost(tts_provider, avg_tts_characters)
    tts_cost_per_day = tts_cost_per_request * tts_requests_per_day

    total_cost_per_day = llm_cost_per_day + tts_cost_per_day

    return {
        "llm_cost_per_day": round(llm_cost_per_day, 4),
        "tts_cost_per_day": round(tts_cost_per_day, 4),
        "total_cost_per_day": round(total_cost_per_day, 4),
        "llm_cost_per_month": round(llm_cost_per_day * 30, 4),
        "tts_cost_per_month": round(tts_cost_per_day * 30, 4),
        "total_cost_per_month": round(total_cost_per_day * 30, 4),
    }
