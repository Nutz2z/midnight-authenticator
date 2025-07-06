#property strict

#include <LicenseManager.mqh>

// Inputs
input string LicenseKey = "";
input string ServerURL = "https://your-server.com/api/licenses";
input int CheckInterval = 1440; // Minutes

// Globals
LicenseManager *license;
datetime lastCheck;

int OnInit() {
  if(StringLen(LicenseKey) == 0) {
    Alert("License key required!");
    return INIT_PARAMETERS_INCORRECT;
  }
  
  license = new LicenseManager(ServerURL, LicenseKey);
  
  if(!license.Validate()) {
    Alert("License error: ", license.GetError());
    return INIT_FAILED;
  }
  
  lastCheck = TimeCurrent();
  return INIT_SUCCEEDED;
}

void OnTick() {
  if(TimeCurrent() - lastCheck >= CheckInterval * 60) {
    if(!license.Validate()) {
      Alert("License invalid: ", license.GetError());
      ExpertRemove();
      return;
    }
    lastCheck = TimeCurrent();
  }
  
  // Your trading logic here
}

void OnDeinit(const int reason) {
  delete license;
}