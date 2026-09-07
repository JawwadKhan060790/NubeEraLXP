/**
 * Utility to parse backend API error responses into field-level error messages
 * and/or a form-level general error message.
 */

export interface ParsedErrors {
  [key: string]: string;
}

export function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/([a-z\d])([A-Z])/g, '$1_$2')
    .toLowerCase();
}

export function parseApiErrors(error: any): ParsedErrors {
  const parsed: ParsedErrors = {};
  
  if (!error) {
    parsed['_form'] = 'An unexpected error occurred.';
    return parsed;
  }

  const responseData = error?.response?.data;
  
  if (responseData) {
    // 1. Check if we have validation errors list: "errors": ["PropName: message"]
    if (Array.isArray(responseData.errors) && responseData.errors.length > 0) {
      responseData.errors.forEach((errStr: string) => {
        const colonIndex = errStr.indexOf(':');
        if (colonIndex > 0) {
          const rawProp = errStr.substring(0, colonIndex).trim();
          const message = errStr.substring(colonIndex + 1).trim();
          const snakeProp = toSnakeCase(rawProp);
          parsed[snakeProp] = message;
        } else {
          // If no colon, set as general error
          parsed['_form'] = errStr;
        }
      });
    }
    
    // 2. Check if we have standard "message"
    if (responseData.message && Object.keys(parsed).length === 0) {
      const msg = responseData.message;
      const lowerMsg = msg.toLowerCase();
      if (lowerMsg.includes('parent_username') || lowerMsg.includes('parent username') || (lowerMsg.includes('parent') && lowerMsg.includes('username'))) {
        parsed['parent_username'] = msg;
      } else if (lowerMsg.includes('username')) {
        parsed['username'] = msg;
      } else if (lowerMsg.includes('email')) {
        parsed['email'] = msg;
      } else if (lowerMsg.includes('phone') || lowerMsg.includes('mobile')) {
        parsed['phone'] = msg;
      } else if (lowerMsg.includes('school')) {
        parsed['school_id'] = msg;
      } else if (lowerMsg.includes('grade')) {
        parsed['grade_id'] = msg;
      } else if (lowerMsg.includes('division') || lowerMsg.includes('section')) {
        parsed['section_code'] = msg;
      } else {
        parsed['_form'] = msg;
      }
    }

    // If message is absent but success is false
    if (Object.keys(parsed).length === 0) {
      parsed['_form'] = 'Action failed. Please check your inputs.';
    }
  } else if (error.message) {
    parsed['_form'] = error.message;
  } else {
    parsed['_form'] = 'Failed to connect to the server.';
  }

  return parsed;
}
