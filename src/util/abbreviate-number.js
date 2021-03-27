export default function abbreviateNumber(number){
    var SI_SYMBOL = ["", "k", "M", "B", "T", "P", "E"];
    
    let negative = number < 0 ? '-' : '';
    number = Math.abs(number);


    // what tier? (determines SI symbol)
    const tier = Math.log10(number) / 3 | 0;

    // if zero, we don't need a suffix
    if (tier <= 0) {
        return negative + parseFloat(number.toFixed(Math.abs(tier) * 3 + 2)).toString();
    }

    // get suffix and determine scale
    const suffix = SI_SYMBOL[tier];
    const scale = Math.pow(10, tier * 3);

    // scale the number
    const scaled = number / scale;

    // format number and add suffix
    return negative + scaled.toFixed(1) + suffix;
}