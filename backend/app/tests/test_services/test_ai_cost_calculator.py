"""
Tests for AI Cost Calculator - Story 27.22
"""

import pytest

from app.services.ai_cost_calculator import (
    LLM_COSTS,
    TTS_COSTS,
    calculate_llm_cost,
    calculate_tts_cost,
)


def test_calculate_llm_cost_deepseek():
    """Test calculating DeepSeek LLM costs"""
    # DeepSeek: input $0.00014, output $0.00028 per 1K tokens
    cost = calculate_llm_cost("deepseek", input_tokens=1000, output_tokens=500)

    # (1000/1000 * 0.00014) + (500/1000 * 0.00028) = 0.00014 + 0.00014 = 0.00028
    assert abs(cost - 0.00028) < 0.000001


def test_calculate_llm_cost_gemini_free():
    """Test calculating Gemini costs (free tier)"""
    cost = calculate_llm_cost("gemini", input_tokens=5000, output_tokens=2000)

    # Gemini is free
    assert cost == 0.0


def test_calculate_llm_cost_openai_gpt4():
    """Test calculating OpenAI GPT-4 costs"""
    # GPT-4: input $0.01, output $0.03 per 1K tokens
    cost = calculate_llm_cost("openai_gpt4", input_tokens=1000, output_tokens=1000)

    # (1000/1000 * 0.01) + (1000/1000 * 0.03) = 0.01 + 0.03 = 0.04
    assert abs(cost - 0.04) < 0.0001


def test_calculate_llm_cost_unknown_provider():
    """Test calculating cost for unknown LLM provider"""
    cost = calculate_llm_cost("unknown_provider", input_tokens=1000, output_tokens=500)

    # Should default to 0.0
    assert cost == 0.0


def test_calculate_llm_cost_zero_tokens():
    """Test calculating LLM cost with zero tokens"""
    cost = calculate_llm_cost("deepseek", input_tokens=0, output_tokens=0)

    assert cost == 0.0


def test_calculate_llm_cost_only_input_tokens():
    """Test calculating LLM cost with only input tokens"""
    cost = calculate_llm_cost("deepseek", input_tokens=1000, output_tokens=0)

    # Only input: 1000/1000 * 0.00014 = 0.00014
    assert abs(cost - 0.00014) < 0.000001


def test_calculate_llm_cost_only_output_tokens():
    """Test calculating LLM cost with only output tokens"""
    cost = calculate_llm_cost("deepseek", input_tokens=0, output_tokens=1000)

    # Only output: 1000/1000 * 0.00028 = 0.00028
    assert abs(cost - 0.00028) < 0.000001


def test_calculate_tts_cost_edge_free():
    """Test calculating Edge TTS costs (free)"""
    cost = calculate_tts_cost("edge_tts", characters=10000)

    # Edge TTS is free
    assert cost == 0.0


def test_calculate_tts_cost_azure():
    """Test calculating Azure TTS costs"""
    # Azure: $0.000004 per character
    cost = calculate_tts_cost("azure_tts", characters=1000)

    # 1000 * 0.000004 = 0.004
    assert abs(cost - 0.004) < 0.000001


def test_calculate_tts_cost_azure_large():
    """Test calculating Azure TTS costs for large text"""
    # 100,000 characters
    cost = calculate_tts_cost("azure_tts", characters=100000)

    # 100000 * 0.000004 = 0.4
    assert abs(cost - 0.4) < 0.000001


def test_calculate_tts_cost_unknown_provider():
    """Test calculating cost for unknown TTS provider"""
    cost = calculate_tts_cost("unknown_provider", characters=1000)

    # Should default to 0.0
    assert cost == 0.0


def test_calculate_tts_cost_zero_characters():
    """Test calculating TTS cost with zero characters"""
    cost = calculate_tts_cost("azure_tts", characters=0)

    assert cost == 0.0


def test_llm_costs_structure():
    """Test LLM_COSTS constant structure"""
    assert "deepseek" in LLM_COSTS
    assert "input" in LLM_COSTS["deepseek"]
    assert "output" in LLM_COSTS["deepseek"]

    assert "gemini" in LLM_COSTS
    assert LLM_COSTS["gemini"]["input"] == 0.0
    assert LLM_COSTS["gemini"]["output"] == 0.0

    assert "openai_gpt4" in LLM_COSTS


def test_tts_costs_structure():
    """Test TTS_COSTS constant structure"""
    assert "edge_tts" in TTS_COSTS
    assert TTS_COSTS["edge_tts"] == 0.0

    assert "azure_tts" in TTS_COSTS
    assert TTS_COSTS["azure_tts"] > 0.0


def test_calculate_llm_cost_realistic_scenario():
    """Test realistic LLM cost calculation scenario"""
    # Generate a quiz with 10 questions
    # Typical: 2000 input tokens, 1500 output tokens
    cost = calculate_llm_cost("deepseek", input_tokens=2000, output_tokens=1500)

    # (2000/1000 * 0.00014) + (1500/1000 * 0.00028) = 0.00028 + 0.00042 = 0.0007
    assert abs(cost - 0.0007) < 0.000001

    # Should be very cheap
    assert cost < 0.01


def test_calculate_tts_cost_realistic_scenario():
    """Test realistic TTS cost calculation scenario"""
    # Generate audio for a vocabulary word with definition and example
    # Typical: ~200 characters
    cost = calculate_tts_cost("azure_tts", characters=200)

    # 200 * 0.000004 = 0.0008
    assert abs(cost - 0.0008) < 0.000001

    # Should be very cheap
    assert cost < 0.01
