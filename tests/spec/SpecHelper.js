beforeEach(function() {
  jasmine.Env.prototype._toBeIdenticalTo = function _toBeIdenticalTo(actual, expected) {
    if (expected == null) {
      expect(expected).toBe(actual);
    }
    else if (typeof expected == "object") {
      // Make sure all the keys match up
      expect(Object.keys(expected).sort() + "").toBe(Object.keys(actual).sort() + "");

      // Recursively check each value individually
      Object.keys(expected).forEach(key => {
        _toBeIdenticalTo(actual[key], expected[key]);
      });
    }
    else {
      expect(expected).toBe(actual);
    }
  }
  jasmine.Matchers.prototype.toBeIdenticalTo = function toBeIdenticalTo(expected){
    return this.env._toBeIdenticalTo(this.actual, expected)
  }

  // additional matchers
  this.addMatchers({
  });
});
