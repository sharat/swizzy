const jsonify = require('./swiftlint-jsonify');

test('adds 1 + 2 to equal 3', () => {

    
    const rawText =
    `/Users/user/project/dir-1-ios/source/dir-1/project/Features/FeatureSummary/FeatureSummaryViewModel.swift:100:5: warning: Cyclomatic Complexity Violation: Function should have complexity 10 or less: currently complexity equals 13 (cyclomatic_complexity)
    /Users/user/project/dir-1-ios/source/dir-1/project/Features/AddFeatures/AddFeatureScene.swift:520:1: warning: File Line Length Violation: File should contain 400 lines or less: currently contains 520 (file_length)
    /Users/user/project/dir-1-ios/source/dir-1/project/Features/AddFeatures/AddFeatureScene.swift:276:5: warning: Function Body Length Violation: Function body should span 40 lines or less excluding comments and whitespace: currently spans 59 lines (function_body_length)
    /Users/user/project/dir-1-ios/source/dir-1/project/Features/AddFeatures/AddFeatureScene.swift:277:9: warning: Nesting Violation: Types should be nested at most 1 level deep (nesting)
    /Users/user/project/dir-1-ios/source/dir-1/project/Features/AddFeatures/AddFeatureScene.swift:13:1: warning: Type Body Length Violation: Type body should span 200 lines or less excluding comments and whitespace: currently spans 219 lines (type_body_length)`
    const data = jsonify(rawText);
    expect(data != null).toBe(true);
});