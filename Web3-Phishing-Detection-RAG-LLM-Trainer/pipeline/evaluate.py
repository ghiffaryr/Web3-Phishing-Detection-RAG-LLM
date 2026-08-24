from utils.io import to_num


def statistics(metrics, dataset, predictions, prefix=""):
    """Statistical measurement of prediction performance."""
    result = {}
    for metric_name, metric_function in metrics.items():
        if "confusion_matrix" in metric_name:
            confusion_matrix = metric_function(dataset, predictions)
            normalized_conf_m_pred = metric_function(dataset, predictions, normalize='pred')
            normalized_conf_m_true = metric_function(dataset, predictions, normalize='true')
            result[prefix+"cm"] = [[to_num(elmt) for elmt in row] for row in confusion_matrix]
            result[prefix+"ncm_pred"] = [[to_num(elmt) for elmt in row] for row in
                            normalized_conf_m_pred]
            result[prefix+"ncm_true"] = [[to_num(elmt) for elmt in row] for row in
                            normalized_conf_m_true]
        if any(substring in metric_name for substring in ["precision", "recall", "f1"]) :
            result[prefix+metric_name] = metric_function(dataset, predictions, average="weighted", zero_division=0)
        if any(substring in metric_name for substring in ["roc_auc"]):
            result[prefix+metric_name] = metric_function(dataset, predictions, average="weighted")
        if any(substring in metric_name for substring in ["accuracy", "balanced accuracy"]):
            result[prefix+metric_name] = metric_function(dataset, predictions)  
    return result