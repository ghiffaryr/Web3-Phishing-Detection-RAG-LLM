import os
import glob
import tarfile
import datasets
import pandas as pd
from sklearn.model_selection import train_test_split
from io import BytesIO
from urllib.request import urlopen
from zipfile import ZipFile
from pathlib import Path
from utils.config import Config


# Get config
raw_data_path = Path(Config.get().data.raw.path)
processed_data_path = Path(Config.get().data.processed.path)

def get_dataset(name: str) -> pd.DataFrame:
    """Load a processed dataset based on a name"""

    if name == "enron":
        return retrieve_enron()
    elif name == "ling":
        return retrieve_ling()
    elif name == "sms":
        return retrieve_sms()
    elif name == "spamassasin":
        return retrieve_spamassassin()
    elif name == "phishingpot_csdmc":
        return retrieve_phishingpot_csdmc()
    else:
        return pd.read_csv(processed_data_path / Path(name) / Path("data.csv"))
    
def retrieve_enron() -> None:
    # Define dataset folder
    enron_raw_data_path = raw_data_path / Path("enron")
    enron_processed_data_path = processed_data_path / Path("enron")

    # Initialize dataset folder
    enron_raw_data_path.mkdir(parents=True, exist_ok=True)
    enron_processed_data_path.mkdir(parents=True, exist_ok=True)

    # Define processed data csv path
    enron_processed_data_csv_path = enron_processed_data_path / Path("data.csv")

    if not os.path.exists(enron_processed_data_csv_path):
        # Download and extract
        url = "https://github.com/MWiechmann/enron_spam_data/raw/master/enron_spam_data.zip"
        with urlopen(url) as zurl:
            with ZipFile(BytesIO(zurl.read())) as zfile:
                zfile.extractall(enron_raw_data_path)

        # Load dataset
        df = pd.read_csv(enron_raw_data_path / Path("enron_spam_data.csv"), encoding="ISO-8859-1")

        # Preprocess
        df = df.fillna("")
        df["text"] = df["Subject"] + df["Message"]
        df["label"] = df["Spam/Ham"].map({"ham": 0, "spam": 1})
        df = df[["text", "label"]]
        df = df.dropna()
        df = df.drop_duplicates()

        # Save
        df.to_csv(enron_processed_data_csv_path, index=False)
        return df
    return pd.read_csv(enron_processed_data_csv_path)
    
def retrieve_ling() -> None:
    # Define dataset folder
    ling_raw_data_path = raw_data_path / Path("ling")
    ling_processed_data_path = processed_data_path / Path("ling")

    # Initialize dataset folder
    ling_raw_data_path.mkdir(parents=True, exist_ok=True)
    ling_processed_data_path.mkdir(parents=True, exist_ok=True)

    # Define processed data csv path
    ling_processed_data_csv_path = ling_processed_data_path / Path("data.csv")

    if not os.path.exists(ling_processed_data_csv_path):
        # Download and extract
        url = "https://github.com/oreilly-japan/ml-security-jp/raw/master/ch02/lingspam_public.tar.gz"
        r = urlopen(url)
        t = tarfile.open(name=None, fileobj=BytesIO(r.read()))
        t.extractall("data/raw/ling")
        t.close()

        # Iterate files
        path = str(ling_raw_data_path) + r"/lingspam_public/bare/*/*"
        data = []

        for fn in glob.glob(path):
            label = 1 if "spmsg" in fn else 0

            with open(fn, "r", encoding="ISO-8859-1") as file:
                text = file.read()
                data.append((text, label))

        # Preprocessing
        df = pd.DataFrame(data, columns=["text", "label"])
        df = df.dropna()
        df = df.drop_duplicates()

        # Save
        df.to_csv(ling_processed_data_csv_path, index=False)
        return df
    return pd.read_csv(ling_processed_data_csv_path)

def retrieve_sms() -> None:
    # Define dataset folder
    sms_raw_data_path = raw_data_path / Path("sms")
    sms_processed_data_path = processed_data_path / Path("sms")

    # Initialize dataset folder
    sms_raw_data_path.mkdir(parents=True, exist_ok=True)
    sms_processed_data_path.mkdir(parents=True, exist_ok=True)

    # Define processed data csv path
    sms_processed_data_csv_path = sms_processed_data_path / Path("data.csv")

    if not os.path.exists(sms_processed_data_csv_path):
        # Download and extract
        url = "https://archive.ics.uci.edu/ml/machine-learning-databases/00228/smsspamcollection.zip"
        with urlopen(url) as zurl:
            with ZipFile(BytesIO(zurl.read())) as zfile:
                zfile.extractall(sms_raw_data_path)

        # Load dataset
        df = pd.read_csv(sms_raw_data_path / Path("SMSSpamCollection"), sep="\t", header=None)

        # Clean dataset
        df = df.drop_duplicates(keep="first")

        # Rename
        df = df.rename(columns={0: "label", 1: "text"})
        df["label"] = df["label"].map({"ham": 0, "spam": 1})

        # Preprocessing
        df = df.dropna()
        df = df.drop_duplicates()

        # Save
        df.to_csv(sms_processed_data_csv_path, index=False)
        return df
    return pd.read_csv(sms_processed_data_csv_path)

def retrieve_spamassassin() -> None:
    # Define dataset folder
    spamassassin_raw_data_path = raw_data_path / Path("spamassassin")
    spamassassin_processed_data_path = processed_data_path / Path("spamassassin")

    # Initialize dataset folder
    spamassassin_raw_data_path.mkdir(parents=True, exist_ok=True)
    spamassassin_processed_data_path.mkdir(parents=True, exist_ok=True)

    # Define processed data csv path
    spamassassin_processed_data_csv_path = spamassassin_processed_data_path / Path("data.csv")

    if not os.path.exists(spamassassin_processed_data_csv_path):
        # Download and extract
        urls = [
            "https://spamassassin.apache.org/old/publiccorpus/20030228_easy_ham.tar.bz2",
            "https://spamassassin.apache.org/old/publiccorpus/20030228_easy_ham_2.tar.bz2",
            "https://spamassassin.apache.org/old/publiccorpus/20030228_hard_ham.tar.bz2",
            "https://spamassassin.apache.org/old/publiccorpus/20030228_spam.tar.bz2",
            "https://spamassassin.apache.org/old/publiccorpus/20050311_spam_2.tar.bz2",
        ]
        for url in urls:
            r = urlopen(url)
            t = tarfile.open(name=None, fileobj=BytesIO(r.read()))
            t.extractall(spamassassin_raw_data_path)
            t.close()
            
        # Iterate files
        path = str(spamassassin_raw_data_path) + r"/*/*"
        data = []

        for fn in glob.glob(path):
            label = 0 if "ham" in fn else 1

            with open(fn, "r", encoding="ISO-8859-1") as file:
                text = file.read()
                data.append((text, label))

        # Preprocessing
        df = pd.DataFrame(data, columns=["text", "label"])
        df = df.dropna()
        df = df.drop_duplicates()

        # Save
        df.to_csv(spamassassin_processed_data_csv_path, index=False)
        return df
    return pd.read_csv(spamassassin_processed_data_csv_path)

def retrieve_phishingpot():
    phishingpot_raw_data_path = raw_data_path / Path("phishingpot")
    phishingpot_processed_data_path = processed_data_path / Path("phishingpot")

    # Initialize dataset folder
    phishingpot_raw_data_path.mkdir(parents=True, exist_ok=True)
    phishingpot_processed_data_path.mkdir(parents=True, exist_ok=True)

    # Define processed data csv path
    phishingpot_processed_data_csv_path = phishingpot_processed_data_path / Path("data.csv")

    if not os.path.exists(phishingpot_processed_data_csv_path):
        # Download and extract
        url = "https://github.com/rf-peixoto/phishing_pot/archive/refs/heads/main.zip"
        with urlopen(url) as zurl:
            with ZipFile(BytesIO(zurl.read())) as zfile:
                zfile.extractall(phishingpot_raw_data_path)

        # Iterate files
        path = str(phishingpot_raw_data_path) + r"/phishing_pot-main/email/*"
        data = []

        for fn in glob.glob(path):
            label = 1

            with open(fn, "r", encoding="ISO-8859-1") as file:
                text = file.read()
                data.append((text, label))

        # Preprocessing
        df = pd.DataFrame(data, columns=["text", "label"])
        df = df.dropna()
        df = df.drop_duplicates()

        # Save
        df.to_csv(phishingpot_processed_data_csv_path, index=False)
        return df
    return pd.read_csv(phishingpot_processed_data_csv_path)

def retrieve_csdmc():
    csdmc_raw_data_path = raw_data_path / Path("csdmc")
    csdmc_processed_data_path = processed_data_path / Path("csdmc")

    # Initialize dataset folder
    csdmc_raw_data_path.mkdir(parents=True, exist_ok=True)
    csdmc_processed_data_path.mkdir(parents=True, exist_ok=True)

    # Define processed data csv path
    csdmc_processed_data_csv_path = csdmc_processed_data_path / Path("data.csv")

    if not os.path.exists(csdmc_processed_data_csv_path):
        # Download and extract
        url = "https://github.com/zrz1996/Spam-Email-Classifier-DataSet/raw/master/ham.zip"
        with urlopen(url) as zurl:
            with ZipFile(BytesIO(zurl.read())) as zfile:
                zfile.extractall(csdmc_raw_data_path)

        # Iterate files
        path = str(csdmc_raw_data_path) + r"/ham/*"
        data = []

        for fn in glob.glob(path):
            label = 0

            with open(fn, "r", encoding="ISO-8859-1") as file:
                text = file.read()
                data.append((text, label))

        # Preprocessing
        df = pd.DataFrame(data, columns=["text", "label"])
        df = df.dropna()
        df = df.drop_duplicates()

        # Save
        df.to_csv(csdmc_processed_data_csv_path, index=False)
        return df
    return pd.read_csv(csdmc_processed_data_csv_path)

def retrieve_phishingpot_csdmc():
    phishingpot_csdmc_processed_data_path = processed_data_path / Path("phishingpot_csdmc")

    # Initialize dataset folder
    phishingpot_csdmc_processed_data_path.mkdir(parents=True, exist_ok=True)

    # Define processed data csv path
    phishingpot_csdmc_processed_data_csv_path = phishingpot_csdmc_processed_data_path / Path("data.csv")
    
    if not os.path.exists(phishingpot_csdmc_processed_data_csv_path):
        df_phishingpot = retrieve_phishingpot().dropna()
        df_csdmc = retrieve_csdmc().dropna()

        min_size = min(len(df_phishingpot), len(df_csdmc))

        # Sample from both dataframes to the smaller size
        sampled_df_phishingpot = df_phishingpot.sample(n=min_size, random_state=0)
        sampled_df_csdmc = df_csdmc.sample(n=min_size, random_state=0)

        # Concatenate the dataframes
        df = pd.concat([sampled_df_phishingpot, sampled_df_csdmc])
        df = df.sample(frac=1).reset_index(drop=True)
        
        # Save
        df.to_csv(phishingpot_csdmc_processed_data_csv_path, index=False)
        return df
    return pd.read_csv(phishingpot_csdmc_processed_data_csv_path)

def train_validation_test_split(df, train_size=0.8, has_validation=True):
    """Return a tuple (DataFrame, DatasetDict) with a custom train/validation/split"""
    # Convert int train_size into float
    if isinstance(train_size, int):
        train_size = train_size / len(df)

    # Shuffled train/validation/test split
    df = df.sample(frac=1, random_state=0)
    df_train, df_test = train_test_split(
        df, test_size=1 - train_size, stratify=df["label"]
    )

    if has_validation:
        df_test, df_validation = train_test_split(
            df_test, test_size=0.5, stratify=df_test["label"]
        )
        return (
            (df_train, df_validation, df_test),
            datasets.DatasetDict(
                {
                    "train": datasets.Dataset.from_pandas(df_train),
                    "validation": datasets.Dataset.from_pandas(df_validation),
                    "test": datasets.Dataset.from_pandas(df_test),
                }
            ),
        )

    else:
        return (
            (df_train, df_test),
            datasets.DatasetDict(
                {
                    "train": datasets.Dataset.from_pandas(df_train),
                    "test": datasets.Dataset.from_pandas(df_test),
                }
            ),
        )