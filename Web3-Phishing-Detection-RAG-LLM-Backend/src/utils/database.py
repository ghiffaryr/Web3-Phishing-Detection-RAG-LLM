import json
import psycopg2
import psycopg2.extras
import psycopg2.pool

from loguru import logger
from utils.config import Config

postgres_pool = psycopg2.pool.ThreadedConnectionPool(minconn=Config.get().postgres.pool.minconn,
                                                     maxconn=Config.get().postgres.pool.maxconn,
                                                     host=Config.get().POSTGRES_HOST,
                                                     port=Config.get().POSTGRES_PORT,
                                                     user=Config.get().POSTGRES_USER,
                                                     password=Config.get().POSTGRES_PASSWORD,
                                                     database=Config.get().POSTGRES_NAME,
                                                     gssencmode=Config.get().postgres.gssencmode)

class DatabaseUtility(object):

    def __init__(self):
        self.__establish_connection()

    def __del__(self):
        postgres_pool.putconn(self.__connection)

    def __establish_connection(self):
        self.__connection = postgres_pool.getconn()
        self.__connection.set_client_encoding("utf-8")

    def execute_insert_query(self, query: str, return_id=False) -> int:
        """Execute insert query to initialized database

        Args:
            query (str): Query string to be executed

        Raises:
            err: Exception from database select query process

        Returns:
            int: Count of affected rows after insert
        """
        try:
            cursor = self.__connection.cursor(cursor_factory=psycopg2.extras.DictCursor)
            cursor.execute(query)
            rowcount = cursor.rowcount
            if return_id:
                row_id = cursor.fetchone()[0]
                self.__connection.commit()
                cursor.close() 
                return row_id
            else:
                self.__connection.commit()
                cursor.close()           
                return rowcount
        except psycopg2.InterfaceError as err:
            logger.error(err)
            self.__establish_connection()
            self.__connection.rollback()
            cursor.close()
            raise err
        except Exception as err:
            logger.error(err)
            self.__connection.rollback()
            cursor.close()
            raise err

    def execute_update_query(self, query: str) -> int:
        """Execute update query to existing records

        Args:
            query (str): Query string to be executed

        Raises:
            err: Exception from database select query process

        Returns:
            int: Count of affected rows
        """
        try:
            cursor = self.__connection.cursor(cursor_factory=psycopg2.extras.DictCursor)
            cursor.execute(query)
            rowcount = cursor.rowcount
            self.__connection.commit()
            cursor.close()           
            return rowcount
        except psycopg2.InterfaceError as err:
            logger.error(err)
            self.__establish_connection()
            self.__connection.rollback()
            cursor.close()
            raise err
        except Exception as err:
            logger.error(err)
            self.__connection.rollback()
            cursor.close()
            raise err

    def execute_delete_query(self, query: str) -> int:
        """Execute delete query to existing records

        Args:
            query (str): Query string to be executed

        Raises:
            err: Exception from database select query process

        Returns:
            int: Count of affected rows
        """
        try:
            cursor = self.__connection.cursor(cursor_factory=psycopg2.extras.DictCursor)
            cursor.execute(query)
            rowcount = cursor.rowcount
            self.__connection.commit()
            cursor.close()           
            return rowcount
        except psycopg2.InterfaceError as err:
            logger.error(err)
            self.__establish_connection()
            self.__connection.rollback()
            cursor.close()
            raise err
        except Exception as err:
            logger.error(err)
            self.__connection.rollback()
            cursor.close()
            raise err
        
    def execute_select_query(self, query: str):
        
        """Execute select query and returns information from database
        
        Raises:
            err: Exception from database select query process
            
        Returns:
            Dictionary contains returned information from select query \n
            values (list[tuple]) -> List of tuple contains rows values \n
            column_names (dict) -> List of columns names returned \n
        
        """
        
        try:
            ret = {}
            cursor = self.__connection.cursor(cursor_factory=psycopg2.extras.DictCursor)
            cursor.execute(query)
            row_values = cursor.fetchall()
            colnames = [desc[0] for desc in cursor.description]
            
            ret["values"] = row_values
            ret["column_names"] = colnames
            
            cursor.close()
            return ret
        except psycopg2.InterfaceError as err:
            logger.error(err)
            self.__establish_connection()
            self.__connection.rollback()
            cursor.close()
            raise err
        except Exception as err:
            logger.error(err)
            self.__connection.rollback()
            cursor.close()
            raise err
        
    def execute_single_select_query(self, query: str):
        
        """Execute select query and returns information from database
        
        Raises:
            err: Exception from database select query process
            
        Returns:
            Dictionary contains returned information from select query \n
            values (list[tuple]) -> List of tuple contains rows values \n
            column_names (dict) -> List of columns names returned \n
        
        """
        
        try:
            ret = {}
            cursor = self.__connection.cursor(cursor_factory=psycopg2.extras.DictCursor)
            cursor.execute(query)
            
            if cursor.pgresult_ptr is not None:
                row_values = cursor.fetchone()
                colnames = [desc[0] for desc in cursor.description]
            else:
                row_values = None
                colnames = None
            
            ret["values"] = row_values
            ret["column_names"] = colnames
            
            cursor.close()
            return ret
        except psycopg2.InterfaceError as err:
            logger.error(err)
            self.__establish_connection()
            self.__connection.rollback()
            cursor.close()
            raise err
        except Exception as err:
            logger.error(err)
            self.__connection.rollback()
            cursor.close()
            raise err
        
    def execute_copy_from_query(self, data, table_name, column_names) -> int:
        """Execute copy_from query to initialized database

        Args:
            query (str): Query string to be executed

        Raises:
            err: Exception from database copy_from query process

        Returns:
            int: Count of affected rows after copy_from
        """
        try:
            cursor = self.__connection.cursor(cursor_factory=psycopg2.extras.DictCursor)
            cursor.copy_from(data, table_name, columns=column_names, null='')
            rowcount = cursor.rowcount
            self.__connection.commit()
            cursor.close()           
            return rowcount
        except psycopg2.InterfaceError as err:
            logger.error(err)
            self.__establish_connection()
            self.__connection.rollback()
            cursor.close()
            raise err
        except Exception as err:
            logger.error(err)
            self.__connection.rollback()
            cursor.close()
            raise err
        
    def to_list(self, res):
        res_list = []
        column_names = res["column_names"]
        rows = res["values"]
        for row in rows:
            formatted_row = {}
            for index, column_name in enumerate(column_names):
                formatted_row[column_name] = row[index]
            res_list.append(formatted_row)
        return res_list
        
    def select_query(self, column, table, condition={}, order_by=None, limit=None, offset=None):
        condition_list = []
        for k, v in condition.items():
            if isinstance(v, str):
                v = f"'{v}'"
            condition_list.append(f"{k} = {v}")
        query = f"SELECT {column} FROM {table} "
        query += f"WHERE {' AND '.join(condition_list)} " if condition is not None else ""
        query += f"ORDER BY {order_by} " if order_by is not None else ""
        query += f"LIMIT {limit} " if limit is not None else ""
        query += f"OFFSET {offset}" if offset is not None else ""
        return query
    
    def insert_query(self, table, columns="", values="", object=None, return_id=False):
        if object != None:
            columns = []
            values = []
            for key, value in object.items():
                columns.append(key)
                if isinstance(value, str):
                    values.append(f"'{value}'")
                elif isinstance(value, dict):
                    value = json.dumps(value)
                    values.append(f"'{value}'::json")
                else:
                    values.append(str(value))
            columns = ",".join(columns)
            values = ",".join(values)
        query = f"INSERT INTO {table} ({columns}) VALUES ({values}) "
        query += "RETURNING id;" if return_id else ""
        return query
    
    def update_query(self, table, set={}, condition={}):
        set_list = []
        for k, v in set.items():
            if isinstance(v, str):
                v = f"'{v}'"
            set_list.append(f"{k} = {v}")
        condition_list = []
        for k, v in condition.items():
            if isinstance(v, str):
                v = f"'{v}'"
            condition_list.append(f"{k} = {v}")
        query = f"UPDATE {table} SET {','.join(set_list)}"
        query += f"WHERE {' AND '.join(condition_list)}" if condition is not None else ""
        return query
    
    def delete_query(self, table, condition=None):
        query = f"DELETE FROM {table} "
        query += f"WHERE {condition}" if condition is not None else ""
        return query