import argparse

from .greeks import all_greeks
from .option import Option
from .pricing import price


def main(argv=None) -> None:
    p = argparse.ArgumentParser(prog="blackscholes", description="Price a European option.")
    p.add_argument("kind", choices=["call", "put"])
    p.add_argument("--spot", type=float, required=True)
    p.add_argument("--strike", type=float, required=True)
    p.add_argument("--rate", type=float, required=True, help="annual risk-free rate, e.g. 0.05")
    p.add_argument("--vol", type=float, required=True, help="annual volatility, e.g. 0.2")
    p.add_argument("--time", type=float, required=True, help="years to expiry")
    p.add_argument("--dividend", type=float, default=0.0, help="continuous dividend yield")
    args = p.parse_args(argv)

    o = Option(args.spot, args.strike, args.rate, args.vol, args.time, args.dividend)
    print(f"price  {price(o, args.kind):.4f}")
    for name, value in all_greeks(o, args.kind).items():
        print(f"{name:<6} {value:.4f}")


if __name__ == "__main__":
    main()
