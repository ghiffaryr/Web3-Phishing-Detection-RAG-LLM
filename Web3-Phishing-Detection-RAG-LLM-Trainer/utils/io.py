from typing import Union
from re import search


def to_num(val: Union[float, int],
           digit: int = 3):
    """
    This function return val into number if the val is integer or float.
    Else it return the val itself.

    Parameters
    ----------
    val : Union[float, int]
        The value to be converted to a number if possible.
    digit : int, optional
        The number of digits to round the value, by default 3.

    Returns
    -------
    Union[float, int, str]
        The converted numeric value or the original value if conversion is not possible.
    """
    val = str(val)
    if not search(r"[^0-1]", val) and len(val) == 10:
        return val
    try:
        val = round_digit(float(val), digit=digit)
        if val.is_integer():
            val = int(val)
    except ValueError:
        pass
    return val


def round_digit(number: Union[float, int],
                digit: int = 3):
    """
    Rounds the given number to the specified number of digits.

    Parameters
    ----------
    number : Union[float, int]
        The number to be rounded.
    digit : int, optional
        The number of digits to round the number to, by default 3.

    Returns
    -------
    float
        The rounded number.
    """
    return round(float(number), digit)