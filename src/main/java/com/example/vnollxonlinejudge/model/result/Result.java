package com.example.vnollxonlinejudge.model.result;

public class Result<T> {
    private int code;
    private String msg;
    private T data;

    public int getCode() {
        return code;
    }

    public void setCode(int code) {
        this.code = code;
    }

    public String getMsg() {
        return msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }

    public T getData() {
        return data;
    }

    public void setData(T data) {
        this.data = data;
    }

    public Result() {
    }

    public Result(T data) {
        this.data = data;
    }

    public static <T> Result<T> Success(String msg) {
        Result<T> result = new Result<>();
        result.setCode(200);
        result.setMsg(msg);
        return result;
    }

    public static <T> Result<T> Success(T data) {
        Result<T> result = new Result<>(data);
        result.setCode(200);
        result.setMsg("成功");
        return result;
    }

    public static <T> Result<T> Success(T data,String msg) {
        Result<T> result = new Result<>(data);
        result.setCode(200);
        result.setMsg(msg);
        return result;
    }

    public static  <T> Result<T> SystemError(String msg) {
        Result<T> result = new Result<>();
        result.setCode(500);
        result.setMsg(msg);
        return result;
    }

    public static  <T> Result<T> LogicError(String msg){
        Result<T> result = new Result<>();
        result.setCode(400);
        result.setMsg(msg);
        return result;
    }
    public static  <T> Result<T> AuthenticationError(String msg){
        Result<T> result = new Result<>();
        result.setCode(401);
        result.setMsg(msg);
        return result;
    }
}
