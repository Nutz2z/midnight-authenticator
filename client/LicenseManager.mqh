#property strict

#include <JAson.mqh>

class LicenseManager {
private:
  string serverUrl;
  string licenseKey;
  string hwid;
  bool isValid;
  string lastError;
  
  string GenerateHWID() {
    string id = IntegerToString(AccountNumber()) + 
                TerminalInfoString(TERMINAL_COMPUTERNAME) +
                TerminalInfoString(TERMINAL_PATH);
    return IntegerToString(StringGetHash(id));
  }
  
  bool MakeRequest(string endpoint, CJAVal &data, CJAVal &result) {
    string headers = "Content-Type: application/json\r\n";
    char post[], resultData[];
    string json = data.Serialize();
    
    StringToCharArray(json, post, 0, StringLen(json));
    ResetLastError();
    
    int res = WebRequest("POST", serverUrl + endpoint, headers, 5000, post, resultData, headers);
    
    if(res == -1) {
      lastError = "Error " + IntegerToString(GetLastError());
      return false;
    }
    
    return result.Deserialize(CharArrayToString(resultData));
  }

public:
  LicenseManager(string url, string key) {
    serverUrl = url;
    licenseKey = key;
    hwid = GenerateHWID();
    isValid = false;
    lastError = "";
  }
  
  bool Validate() {
    CJAVal data, result;
    data["key"] = licenseKey;
    data["hwid"] = hwid;
    
    if(!MakeRequest("/validate", data, result)) {
      lastError = "Connection failed: " + lastError;
      return false;
    }
    
    if(!result["valid"].ToBool()) {
      lastError = result["error"].ToStr();
      return false;
    }
    
    datetime expiry = StringToTime(result["expiryDate"].ToStr());
    if(TimeCurrent() > expiry) {
      lastError = "License expired";
      return false;
    }
    
    isValid = true;
    return true;
  }
  
  string GetError() const { return lastError; }
  bool IsValid() const { return isValid; }
};