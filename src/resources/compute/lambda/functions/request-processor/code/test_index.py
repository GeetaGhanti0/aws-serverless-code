import json
import pytest
import index
@pytest.fixture()
def setup():
    print("\nSetUp")
    yield
    print("\n Teardown1")
@pytest.mark.parametrize(
    "validReference, result",
    [
        (
            "Your reference number: 121008327701\n\nOur reference: 10659075\n\f",
            "10659075",
        ),
    ],
)
def test_validReference(setup, validReference, result):
    assert index.extract_reference_number(validReference) == result
@pytest.mark.parametrize(
    "invalidReference",
    [
        ("ur reference: 9090"),
        ("Our eference: 9090"),
        ("ourreferen: yueyeu89866"),
    ],
)
def test_invalidReferenceRaiseException(setup, invalidReference):
    with pytest.raises(ValueError):
        index.extract_reference_number(invalidReference)
@pytest.mark.parametrize(
    "validPostCode, result",
    [
        (
            "Mrs W Wewepwclastname\n1 Testing Road\n\nAddress Line 2\n\nBELFAST\n\nBT5 5HH\n\f",
            {
                "line1": "1 Testing Road",
                "line2": "Address Line 2",
                "line3": "BELFAST",
                "postcode": "BT5 5HH",
            },
        ),
        (
            "Mrs W Wewepwclastname\n1 Testing Road\n\nAddress Line 2\n\nBELFAST\n\nbt55hh\n\f",
            {
                "line1": "1 Testing Road",
                "line2": "Address Line 2",
                "line3": "BELFAST",
                "postcode": "bt55hh",
            },
        ),
        (
            "Mrs W Wewepwclastname\n1 Testing Road\n\n1 Testing Road\n\nBELFAST\n\nbt55hh\n\f",
            {
                "line1": "1 Testing Road",
                "line3": "BELFAST",
                "postcode": "bt55hh",
            },
        ),
    ],
)
def test_validPostCode(setup, validPostCode, result):
    assert index.validate_postcode_extract_address(validPostCode) == result
def test_validate_payload_dosnt_throw_with_valid_payload():
    payload = {"string-key": "mock_string"}
    try:
        index.validate_payload(payload, "fixtures/string.json")
    except ValueError as e:
        pytest.fail(str(e))
def test_validate_payload_throws_with_invalid_payload():
    payload = {"string-key": 1}
    with pytest.raises(ValueError):
        index.validate_payload(payload, "fixtures/string.json")
def test_parse_payload_valid_payload():
    event = {"Records": [{"body": json.dumps({"key": "value"})}]}
    payload = index.parse_payload(event)
    assert payload["key"] == "value"
def test_validate_contours_count_size_greater_than_5():
    contours = ["h", "u", "u", "h", "u", "u"]
    try:
        index.validate_contours(contours)
    except ValueError as e:
        pytest.fail(str(e))
def test_validate_contours_count_size_less_than_5():
    contours = ["h", "u", "u"]
    with pytest.raises(ValueError):
        index.validate_contours(contours)
