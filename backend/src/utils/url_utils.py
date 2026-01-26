import re
from typing import List

def extract_urls(input_string: str) -> List[str]:
    """
    Extracts a list of URLs from a possibly concatenated string.
    
    Args:
        input_string (str): The input string containing one or more URLs.
        
    Returns:
        List[str]: A list of distinct URLs found in the string.
    """
    if not input_string:
        return []
        
    # Pattern looks for http:// or https:// and captures everything until the next protocol start or end of string.
    # We use a lookahead (?=...) to peek at the next http without consuming it, or the end of the string ($).
    # This effectively splits the string on the start of a URL.
    
    # Simple strategy: Find all indices of 'http://' or 'https://'
    # Then slice the string based on those indices.
    
    # We can use regex finditer to locate starts.
    pattern = re.compile(r'(https?://)')
    matches = list(pattern.finditer(input_string))
    
    if not matches:
        return []
        
    urls = []
    for i in range(len(matches)):
        start = matches[i].start()
        # End is the start of the next match, or the end of the string
        if i + 1 < len(matches):
            end = matches[i+1].start()
        else:
            end = len(input_string)
            
        url = input_string[start:end].strip()
        if url:
            urls.append(url)
            
    return urls
