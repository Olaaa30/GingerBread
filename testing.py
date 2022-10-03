#!/usr/bin/python3
# from add_0 import add
# a = 1
# b = 2
# print(f"{a} + {b} = {add(a, b)}")
# from unicodedata import name
# from unittest import result
# if __name__ == "__main__":
#     from calculator_1 import add, mul, div, sub
#     a = 10
#     b = 5
#     print("{:d} + {:d} = {:d}".format(a, b, add(a, b)))
#     print("{:d} - {:d} = {:d}".format(a, b, sub(a, b)))
#     print("{:d} * {:d} = {:d}".format(a, b, mul(a, b)))
#     print("{:d} / {:d} = {:d}".format(a, b, div(a, b)))
# from ast import arg
# from cgi import print_arguments
# from sys import argv


# if __name__ == "__main__":
#     import sys
#     i = 1
#     if (len(argv)-1) >= 2:
#         print("{:d} arguments:".format(len(argv)-1))
#         while i < len(argv):
#             print("{:d}: {}".format(i, argv[i]))
#             i += 1
#     elif (len(argv)-1) == 0:
#         print("{:d} arguments.".format(len(argv)-1))
#     else:
#         print("{:d} argument:".format(len(argv)-1))
#         print("{:d}: {}".format(i, argv[i]))

from hashlib import new
from tabnanny import check
from unicodedata import name

from tomlkit import key
from calculator_1 import add, sub, mul

def calculator():
    from sys import argv
    operators = ["+", "-", "*", "/"]
    num_of_args = len(argv) - 1
    if num_of_args == 3:
        a = int(argv[1])
        b = int(argv[3])
        if argv[2] == "-":
            result = int(argv[1]) - int(argv[3])
            print("{:d} - {:d} = {:d}".format(a, b, result))
            return 0
        elif argv[2] == "+":
            result = int(argv[1]) + int(argv[3])
            print("{:d} + {:d} = {:d}".format(a, b, result))
            exit(0)
        elif argv[2] == "*":
            result = int(argv[1]) * int(argv[3])
            print("{:d} * {:d} = {:d}".format(a, b, result))
            return 0
        elif argv[2] == "/":
            result = int(argv[1]) * int(argv[3])
            print("{:d} / {:d} = {:d}".format(a, b, result))
            return 0
        elif argv[2] not in operators:
            print("Unknown operator. Available operators: +, -, * and /")
            return 1
    else:
        print("Usage: ./100-my_calculator.py <a> <operator> <b>")
        return 1


# if __name__ == "__main__":
    # calculator()
#     import hidden_4
#     list = dir(hidden_4)
#     for i in list:
#         if i[0] != "_":
#             print(i)
# matrix = [
#      [1, 2, 3, 4],
#      [5, 6, 7, 8],
#      [9, 10, 11, 12],
# ]

# new_matrix = [num for item in matrix for num in item]
# print(new_matrix)

import math
import random

# list = [[1,2,3], 
#         [4,5,6], 
#         [7,8,9]]
# def print_matrix_integer(matrix=[[]]):                            
#     for i in matrix:
#         print(' '.join('{:d}'.format(j)for j in i))
# print_matrix_integer(list)

# my_list = [1, 2, 3, 4, 5]
# reversed_list = my_list[::-1]
# for i in reversed_list:
#     print("{:d}".format(i))
def delete_at(my_list=[], idx=0):                                                                                                                                                                                                                                  
    if idx < 0 or idx > (len(my_list) - 1):                                                                                             
        return my_list                                                                                                                  
    for i in range(len(my_list)):                                                                                                                   
        if i == idx:                                                                                                                    
            del my_list[i]                                                                                                    
    return my_list                                                                                                                      

my_list = [1, 2, 3, 4, 5]
idx = -13
new_list = delete_at(my_list, idx)

def get_mul_func(num):
    print("inside func")
    def mul_func(value):
        print("multiplyiing {:d} and {:d}".format(num, value))
        return num * value
    return mul_func

# generated_mul_func = get_mul_func(10)
# print("8 * 10 = ", generated_mul_func(8))
# list_of_nums = [1, 23, 34, 43, 7, 3, 6 ,8, 31,]
# def check_odd(num):
#     if num % 2 == 1:
#         return True
#     return False

# def get_odd_nums(check_odd, list):
#     odd_nums = []
#     for i in list:
#         if check_odd(i) == True:
#             odd_nums.append(i)
#     return odd_nums

# print(get_odd_nums(check_odd, list_of_nums))

# rand_list = []
# for i in range(20):
#     if i % 2 == 0:
#         rand_list.append("H")
#     else:
#         rand_list.append("T")

# my_dict = {}

# for i in rand_list:
#     if i not in my_dict:
#         my_dict[i] = 0
#     else:
#         my_dict[i] += 1
# print(my_dict)
# for i in my_dict:
#     print(i, my_dict[i])
# nums = []
# for i in range(100):
#     nums.append(random.randint(1, 1001))
# multiples_of_9 = []

# for i in nums:
#     if i % 9 == 0:
#         multiples_of_9.append(i)
def square_num(num):
    return num ** 2

def square_matrix_simple(matrix=[]):                                  
    new_matrix = matrix
    for i in range(len(new_matrix)):                                              
        for j in range(len(new_matrix[i])):                                                 
            new_matrix[i][j] = square_num(new_matrix[i][j])                                            
    return new_matrix 
print(square_num(8))
matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]
]
# print(matrix)
# new_matrix = square_matrix_simple(matrix)
# print(new_matrix)

#!/usr/bin/python3                                                    
def uniq_add(my_list=[]):                                             
    sum = 0
    new_list = set(my_list)
    for i in new_list:
        sum += i
    return sum

print(uniq_add([1,1,3,3]))
def best_score(my_dict):
    highest_score = 0
    name = ""
    for key in my_dict:
        if my_dict[key] > highest_score:
            highest_score = my_dict[key]
            name = key
    if highest_score == 0:
        return None
    return name
a_dictionary = {'John': 14, 'Bob': 14, 'Mike': 14, 'Molly': 16, 'Adam': 10}
# best_key = best_score(a_dictionary)
# print("Best score: {}".format(best_key))

# best_key = best_score(None)
# print("Best score: {}".format(best_key))
def complex_delete(my_dict, value):
    for keys in my_dict.copy():
        if my_dict[keys] == value:
            del my_dict[keys]
    return my_dict
new_dict = complex_delete(a_dictionary, 14)
print(new_dict)