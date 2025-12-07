"""
Tool credit costs configuration
NOW FETCHES FROM SUPABASE - Database is the single source of truth
"""
import os
from typing import Dict, List, Optional
from supabase import create_client, Client
import logging

logger = logging.getLogger(__name__)

# Cache for tool costs to avoid repeated database calls
_tool_cache: Dict[str, dict] = {}
_cache_initialized = False

# Tools that are free for non-logged-in users (guest access)
FREE_TOOLS = ['resize', 'convert']


def get_supabase_client() -> Client:
    """Get Supabase client for database operations"""
    from auth.supabase_client import supabase_admin
    return supabase_admin


def initialize_tool_cache() -> bool:
    """
    Initialize tool cache from Supabase
    
    Returns:
        True if successful, False otherwise
    """
    global _tool_cache, _cache_initialized
    
    try:
        supabase = get_supabase_client()
        response = supabase.table('tool_config').select('*').eq('is_active', True).execute()
        
        if response.data:
            _tool_cache = {tool['tool_name']: tool for tool in response.data}
            _cache_initialized = True
            logger.info(f"Tool cache initialized with {len(_tool_cache)} tools")
            return True
        else:
            logger.warning("No tools found in database")
            return False
    
    except Exception as e:
        logger.error(f"Failed to initialize tool cache: {str(e)}")
        return False


def get_tool_cost(tool_name: str, use_cache: bool = True) -> int:
    """
    Get credit cost for a specific tool from Supabase
    
    Args:
        tool_name: Name of the tool
        use_cache: Whether to use cached values (default: True)
    
    Returns:
        Credit cost (defaults to 1 if tool not found)
    """
    global _cache_initialized
    
    # Initialize cache if not done yet
    if not _cache_initialized and use_cache:
        initialize_tool_cache()
    
    # Try to get from cache first
    if use_cache and tool_name in _tool_cache:
        return _tool_cache[tool_name]['credit_cost']
    
    # Fetch from database
    try:
        supabase = get_supabase_client()
        response = supabase.table('tool_config')\
            .select('credit_cost')\
            .eq('tool_name', tool_name)\
            .eq('is_active', True)\
            .single()\
            .execute()
        
        if response.data:
            cost = response.data['credit_cost']
            # Update cache
            if use_cache:
                _tool_cache[tool_name] = response.data
            return cost
        else:
            logger.warning(f"Tool '{tool_name}' not found in database, defaulting to 1 credit")
            return 1
    
    except Exception as e:
        logger.error(f"Error fetching cost for tool '{tool_name}': {str(e)}")
        # Return default cost as fallback
        return 1


def get_tool_info(tool_name: str, use_cache: bool = True) -> Optional[dict]:
    """
    Get full tool information from Supabase
    
    Args:
        tool_name: Name of the tool
        use_cache: Whether to use cached values
    
    Returns:
        Tool information dictionary or None if not found
    """
    global _cache_initialized
    
    # Initialize cache if not done yet
    if not _cache_initialized and use_cache:
        initialize_tool_cache()
    
    # Try to get from cache first
    if use_cache and tool_name in _tool_cache:
        return _tool_cache[tool_name]
    
    # Fetch from database
    try:
        supabase = get_supabase_client()
        response = supabase.table('tool_config')\
            .select('*')\
            .eq('tool_name', tool_name)\
            .eq('is_active', True)\
            .single()\
            .execute()
        
        if response.data:
            # Update cache
            if use_cache:
                _tool_cache[tool_name] = response.data
            return response.data
        else:
            logger.warning(f"Tool '{tool_name}' not found in database")
            return None
    
    except Exception as e:
        logger.error(f"Error fetching info for tool '{tool_name}': {str(e)}")
        return None


def get_all_tools(use_cache: bool = True) -> List[dict]:
    """
    Get list of all active tools from Supabase
    
    Args:
        use_cache: Whether to use cached values
    
    Returns:
        List of dictionaries with tool information
    """
    global _cache_initialized
    
    # Initialize cache if not done yet
    if not _cache_initialized and use_cache:
        initialize_tool_cache()
    
    # Return from cache if available
    if use_cache and _tool_cache:
        return list(_tool_cache.values())
    
    # Fetch from database
    try:
        supabase = get_supabase_client()
        response = supabase.table('tool_config')\
            .select('*')\
            .eq('is_active', True)\
            .order('tool_name')\
            .execute()
        
        if response.data:
            # Update cache
            if use_cache:
                _tool_cache.clear()
                for tool in response.data:
                    _tool_cache[tool['tool_name']] = tool
                _cache_initialized = True
            
            return response.data
        else:
            logger.warning("No active tools found in database")
            return []
    
    except Exception as e:
        logger.error(f"Error fetching all tools: {str(e)}")
        return []


def is_tool_available(tool_name: str, use_cache: bool = True) -> bool:
    """
    Check if a tool is available and active
    
    Args:
        tool_name: Name of the tool
        use_cache: Whether to use cached values
    
    Returns:
        True if tool exists and is active, False otherwise
    """
    tool_info = get_tool_info(tool_name, use_cache=use_cache)
    return tool_info is not None and tool_info.get('is_active', False)


def is_free_tool(tool_name: str) -> bool:
    """
    Check if a tool is free for guest users
    
    Args:
        tool_name: Name of the tool
    
    Returns:
        True if tool is free for guests, False otherwise
    """
    return tool_name in FREE_TOOLS


def refresh_tool_cache() -> bool:
    """
    Force refresh of tool cache from database
    
    Returns:
        True if successful, False otherwise
    """
    global _tool_cache, _cache_initialized
    _tool_cache.clear()
    _cache_initialized = False
    return initialize_tool_cache()


# Backward compatibility - these are now deprecated but kept for compatibility
# They will be removed in future versions
TOOL_COSTS = {}  # Empty dict - use get_tool_cost() instead
TOOL_NAMES = {}  # Empty dict - use get_tool_info() instead
TOOL_DESCRIPTIONS = {}  # Empty dict - use get_tool_info() instead

# Log deprecation warning
logger.warning(
    "Direct access to TOOL_COSTS, TOOL_NAMES, and TOOL_DESCRIPTIONS is deprecated. "
    "Use get_tool_cost(), get_tool_info(), and get_all_tools() instead."
)
